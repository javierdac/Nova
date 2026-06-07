import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { ObjectiveModel, type ObjectiveDoc } from './objective.model.js';

class ObjectiveRepository extends BaseRepository<ObjectiveDoc> {
  protected readonly searchableFields = ['title', 'description'];
}

export const objectiveRepository = new ObjectiveRepository(ObjectiveModel);
