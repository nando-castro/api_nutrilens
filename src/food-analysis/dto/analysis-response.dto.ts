export class FoodItemDto {
  nome: string;
  caloriasPorPorcao: number;
  porcaoDescricao: string;
  confianca: number;
}

export class AnalysisResponseDto {
  itens: FoodItemDto[];
  mensagem: string;
}
