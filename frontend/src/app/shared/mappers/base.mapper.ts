export interface Mapper<T, D> {
  toDomain(dto: D): T;
  toDto?(domain: T): D;
}
