import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { PositionModel, type PositionDoc } from './position.model.js';
import { SkillModel, type SkillDoc } from './skill.model.js';
import { SkillCatalogModel, type SkillCatalogDoc } from './skillCatalog.model.js';

class PositionRepository extends BaseRepository<PositionDoc> {
  protected readonly searchableFields = ['title', 'notes'];
}
export const positionRepository = new PositionRepository(PositionModel);

class SkillRepository extends BaseRepository<SkillDoc> {
  protected readonly searchableFields = ['skill'];
}
export const skillRepository = new SkillRepository(SkillModel);

class SkillCatalogRepository extends BaseRepository<SkillCatalogDoc> {
  protected readonly searchableFields = ['name', 'description'];
}
export const skillCatalogRepository = new SkillCatalogRepository(SkillCatalogModel);
