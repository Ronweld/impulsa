export class FileModel {
    constructor(
      public name: string,
      public size: number,
      public type: string,
      public url: string,
      public status: string = 'active',
      public disabled: boolean = false,
    ) {}
  }
  