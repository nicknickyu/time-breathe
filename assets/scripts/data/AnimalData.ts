/** 动物类型枚举 */
export enum AnimalType {
    BISON = 'bison',
    OWL = 'owl',
    HIPPO = 'hippo',
}

/** 目标动物数据：类型、需求总数、已入住数 */
export interface TargetAnimal {
    type: AnimalType;
    totalCount: number;
    settledCount: number;
}
