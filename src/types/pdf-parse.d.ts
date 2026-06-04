declare module "pdf-parse" {
  function pdf(buffer: Buffer): Promise<{ text: string; numpages: number }>;
  export = pdf;
}
