export interface LlmProvider {
  complete(input: {
    system: string;
    user: string;
  }): Promise<string>;
}