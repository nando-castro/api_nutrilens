// src/shared/translation/translation.service.ts
import { v2 as Translate } from '@google-cloud/translate';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly client: Translate.Translate;

  constructor() {
    // Usa GOOGLE_APPLICATION_CREDENTIALS como já está usando no Vision
    this.client = new Translate.Translate();
  }

  async toPortuguese(text: string): Promise<string> {
    const value = text?.trim();
    if (!value) return value;

    try {
      const [translated] = await this.client.translate(value, 'pt');
      return translated;
    } catch (error) {
      this.logger.error(
        `Erro ao traduzir "${value}" para PT-BR`,
        (error as Error).stack,
      );
      // fallback: devolve original
      return value;
    }
  }
}
