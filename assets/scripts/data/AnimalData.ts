export enum AnimalType {
    BISON = 'bison',
    OWL = 'owl',
    HIPPO = 'hippo',
}

export interface TargetAnimal {
    type: AnimalType;
    totalCount: number;
    settledCount: number;
}
