// src/shared/nutrition/nutrition.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type NutritionInfo = {
  caloriesPer100g: number;
  defaultPortionGrams: number;
};

type AlimentoRegistro = {
  id: number;
  description: string; // nome em PT-BR
  category: string;
  energy_kcal: number | string;
  // demais campos serão ignorados aqui
};

type AlimentosJsonComWrapper = {
  alimentos: AlimentoRegistro[];
};

type IndexedAlimento = {
  base: AlimentoRegistro;
  normalizedDescription: string;
};

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);
  private readonly alimentos: IndexedAlimento[];

  constructor() {
    const filePath = path.join(
      __dirname,
      'data',
      'alimentos.json', // dist/shared/nutrition/data/alimentos.json
    );

    this.logger.log(`Carregando base nutricional de: ${filePath}`);

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as
      | AlimentosJsonComWrapper
      | AlimentoRegistro[];

    let alimentosArray: AlimentoRegistro[];

    if (Array.isArray(parsed)) {
      // Formato: [ { ... }, { ... } ]
      alimentosArray = parsed;
    } else if (Array.isArray(parsed.alimentos)) {
      // Formato: { "alimentos": [ { ... } ] }
      alimentosArray = parsed.alimentos;
    } else {
      alimentosArray = [];
    }

    this.alimentos = alimentosArray.map((a) => ({
      base: a,
      normalizedDescription: this.normalize(a.description),
    }));

    this.logger.log(
      `NutritionService carregou ${this.alimentos.length} alimentos do JSON.`,
    );
  }

  /**
   * Recebe o nome em PT-BR (já traduzido) e tenta encontrar
   * o alimento mais parecido na tabela local.
   */
  getByPortugueseName(nomePortugues: string): NutritionInfo | null {
    const query = this.normalize(nomePortugues);
    if (!query) return null;

    const candidatos = this.alimentos
      .map(({ base, normalizedDescription }) => {
        let score = 0;

        if (normalizedDescription === query) {
          score = 3; // match exato
        } else if (
          normalizedDescription.includes(query) ||
          query.includes(normalizedDescription)
        ) {
          score = 2; // um contém o outro
        } else {
          const palavras = query.split(' ').filter(Boolean);
          const matches = palavras.filter((p) =>
            normalizedDescription.includes(p),
          ).length;
          score = matches; // quanto mais palavras baterem, melhor
        }

        return { base, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    const melhor = candidatos[0]?.base;

    if (!melhor) {
      this.logger.warn(
        `Nenhum alimento encontrado no JSON para "${nomePortugues}" (query normalizada: "${query}")`,
      );
      return null;
    }

    const kcal =
      typeof melhor.energy_kcal === 'number'
        ? melhor.energy_kcal
        : Number(melhor.energy_kcal) || 0;

    this.logger.debug(
      `Match nutrição: "${nomePortugues}" -> "${melhor.description}" | ${kcal.toFixed(
        1,
      )} kcal/100g`,
    );

    return {
      caloriesPer100g: kcal,
      defaultPortionGrams: 100, // você pode personalizar por alimento depois
    };
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^\w\s]/g, ' ') // remove pontuação
      .replace(/\s+/g, ' ') // colapsa espaços
      .trim();
  }
}
