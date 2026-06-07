import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { TeamModel, type TeamDoc } from './team.model.js';

class TeamRepository extends BaseRepository<TeamDoc> {
  protected readonly searchableFields = ['name', 'description', 'mission'];

  findByIdPopulated(id: string) {
    return TeamModel.findById(id)
      .populate('lead', 'name email avatarUrl role')
      .populate('members', 'name email avatarUrl role seniority weeklyCapacityHours')
      .lean()
      .exec();
  }
}

export const teamRepository = new TeamRepository(TeamModel);
