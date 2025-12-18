import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { Injectable, Logger } from '@nestjs/common';
import {
  NutritionInfo,
  NutritionService,
} from '../shared/nutrition/nutrition.service';
import { TranslationService } from '../shared/translation/translation.service';
import { AnalysisResponseDto } from './dto/analysis-response.dto';

type AnnotateImageResponse =
  protos.google.cloud.vision.v1.IAnnotateImageResponse;
type EntityAnnotation = protos.google.cloud.vision.v1.IEntityAnnotation;
type LocalizedObjectAnnotation =
  protos.google.cloud.vision.v1.ILocalizedObjectAnnotation;

const FOOD_GATE_LABELS = new Set<string>([
  'food',
  'dish',
  'meal',
  'cuisine',
  'ingredient',
  'recipe',
  'produce',
]);

// Labels genéricas / irrelevantes que vamos ignorar
const GENERIC_LABELS = new Set<string>([
  'food',
  'produce',
  'ingredient',
  'fried food',
  'vegetable',
  'cuisine',
  'dish',
  'meal',
  'recipe',
  'tableware',
  'dinnerware',
  'fast food',
  'natural foods',
  'staple food',
  'garnish',
  'lunch',
  'breakfast',
  'dinner',
  'cup',
  'coffee cup',
  'mug',
  'serveware',
  'drinkware',
  'cookware and bakeware',
  'dishware',
  'kitchen utensil',
  'food group',
  'finger food',
  'snack',
  'snack food',
]);

@Injectable()
export class FoodAnalysisService {
  private readonly logger = new Logger(FoodAnalysisService.name);
  private readonly client: ImageAnnotatorClient;

  constructor(
    private readonly translationService: TranslationService,
    private readonly nutritionService: NutritionService,
  ) {
    this.client = new ImageAnnotatorClient();
  }

  // Normalização básica para comparações
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extrai uma “chave” simples do alimento (ex.: "arroz branco" -> "arroz")
  private extractFoodKey(nomePt: string): string {
    const normalized = this.normalize(nomePt);
    const [firstWord] = normalized.split(' ');
    return firstWord || normalized;
  }

  private isFoodGatePositive(
    labels: EntityAnnotation[],
    objects: LocalizedObjectAnnotation[],
  ): boolean {
    // 1) gate por labels genéricas de comida com score alto
    const labelGate = labels.some((l) => {
      const desc = this.normalize(l.description ?? '');
      const score = l.score ?? 0;
      return FOOD_GATE_LABELS.has(desc) && score >= 0.75;
    });

    // 2) gate por objetos (quando Vision detecta "Apple", "Pizza", etc.)
    // aqui não dá pra manter lista infinita, então só exigimos score alto
    // e que o nome não seja obviamente não-alimento (pessoa, carro etc.)
    const objectGate = objects.some((o) => {
      const name = this.normalize(o.name ?? '');
      const score = o.score ?? 0;
      if (score < 0.75) return false;

      const blocked = new Set([
        'person',
        'human',
        'vehicle',
        'car',
        'phone',
        'electronics',
      ]);
      if (blocked.has(name)) return false;

      return true;
    });

    return labelGate || objectGate;
  }

  private pickCandidates(
    labels: EntityAnnotation[],
    objects: LocalizedObjectAnnotation[],
  ): Array<{ englishName: string; score: number }> {
    const fromObjects = objects
      .filter((o) => (o.score ?? 0) >= 0.6)
      .map((o) => ({
        englishName: (o.name ?? '').trim(),
        score: o.score ?? 0,
      }));

    const fromLabels = labels
      .filter((l) => (l.score ?? 0) >= 0.6)
      .map((l) => ({
        englishName: (l.description ?? '').trim(),
        score: l.score ?? 0,
      }))
      .filter((c) => {
        const desc = this.normalize(c.englishName);
        return desc.length > 0 && !GENERIC_LABELS.has(desc);
      });

    // junta e ordena
    return [...fromObjects, ...fromLabels].sort((a, b) => b.score - a.score);
  }

  private isPhraseyPortugueseFoodName(nomePt: string): boolean {
    const pt = this.normalize(nomePt);

    // frases/descritivos que não são "nome de alimento"
    if (
      pt.includes(' para ') ||
      pt.includes(' com as ') ||
      pt.includes(' com a ') ||
      pt.includes(' comer ') ||
      pt.includes(' feito ') ||
      pt.includes(' feitos ') ||
      pt.includes(' tipo ') ||
      pt.includes(' em ') // costuma aparecer em descrições longas
    ) {
      return true;
    }

    // muito longo tende a ser descrição (“comidinhas para comer com as mãos”)
    if (pt.split(' ').length >= 5) return true;

    return false;
  }

  async analyzeImage(fileBuffer: Buffer): Promise<AnalysisResponseDto> {
    this.logger.log(
      `Enviando imagem para Google Cloud Vision (${fileBuffer.length} bytes)`,
    );

    const [result]: [AnnotateImageResponse] = await this.client.annotateImage({
      image: { content: fileBuffer },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 25 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 25 },
      ],
    });

    const labels: EntityAnnotation[] = result.labelAnnotations ?? [];
    const objects: LocalizedObjectAnnotation[] =
      result.localizedObjectAnnotations ?? [];

    this.logger.debug(
      `Labels: ${labels
        .map((l) => `${l.description} (${(l.score ?? 0).toFixed(2)})`)
        .join(', ')}`,
    );

    this.logger.debug(
      `Objects: ${objects
        .map((o) => `${o.name} (${(o.score ?? 0).toFixed(2)})`)
        .join(', ')}`,
    );

    // Gate: se não tem cara de comida, não processa
    if (!this.isFoodGatePositive(labels, objects)) {
      return {
        itens: [],
        mensagem:
          'A imagem não parece conter alimentos (ou não foi possível detectar comida com confiança). Tente uma foto mais próxima e nítida do prato.',
      };
    }

    const candidates = this.pickCandidates(labels, objects).slice(0, 12);

    const rawItens = await Promise.all(
      candidates.map(async (c) => {
        const englishName = c.englishName;
        const nomePt = await this.translationService.toPortuguese(englishName);

        // ✅ filtro anti-“comidinhas para comer com as mãos” e outras descrições
        if (this.isPhraseyPortugueseFoodName(nomePt)) {
          this.logger.debug(
            `Ignorando tradução "fraseada": "${englishName}" -> "${nomePt}"`,
          );
          return null;
        }

        // filtro forte: só aceita se existir na base nutricional local
        const nutrition: NutritionInfo | null =
          this.nutritionService.getByPortugueseName(nomePt);

        if (!nutrition) return null;

        const caloriesPer100g = Math.round(nutrition.caloriesPer100g);
        const portionGrams = nutrition.defaultPortionGrams ?? 100;

        this.logger.debug(
          `Item processado: "${englishName}" -> "${nomePt}" | kcal/100g=${caloriesPer100g} | porção padrão=${portionGrams}g`,
        );

        return {
          nome: nomePt,
          caloriasPorPorcao: caloriesPer100g,
          porcaoDescricao: `${portionGrams}g (porção padrão)`,
          confianca: c.score,
        };
      }),
    );

    const filtered = rawItens.filter(Boolean) as Array<{
      nome: string;
      caloriasPorPorcao: number;
      porcaoDescricao: string;
      confianca: number;
    }>;

    // dedupe por chave
    const itensMap = new Map<string, (typeof filtered)[number]>();
    for (const item of filtered) {
      const key = this.extractFoodKey(item.nome);
      const existing = itensMap.get(key);
      if (!existing || item.confianca > existing.confianca) {
        itensMap.set(key, item);
      }
    }

    const itens = Array.from(itensMap.values());

    return {
      itens,
      mensagem:
        itens.length > 0
          ? 'Itens estimados via Vision + tradução + base local. Confirme o que faz sentido e ajuste a porção.'
          : 'Detectei que há comida na imagem, mas não consegui mapear para alimentos da sua base. Tente uma foto mais próxima ou ajuste o item manualmente.',
    };
  }
}
