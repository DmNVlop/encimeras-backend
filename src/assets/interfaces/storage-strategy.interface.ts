export interface IStorageStrategy {
  save(file: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(filename: string): Promise<void>;
}
