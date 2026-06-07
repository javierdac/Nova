import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { orgService } from './org.service.js';
import type {
  CandidateDto,
  CreatePositionDto,
  CreateSkillDto,
  CreateSkillCatalogDto,
  UpdatePositionDto,
  UpdateSkillDto,
  UpdateSkillCatalogDto,
} from './org.dto.js';

export const orgController = {
  // Positions / hiring
  listPositions: asyncHandler(async (req, res: Response) => paginated(res, await orgService.listPositions(validatedQuery(req)))),
  createPosition: asyncHandler(async (req: Request, res: Response) => created(res, await orgService.createPosition(req.body as CreatePositionDto))),
  updatePosition: asyncHandler(async (req: Request, res: Response) => ok(res, await orgService.updatePosition(req.params.id, req.body as UpdatePositionDto))),
  removePosition: asyncHandler(async (req: Request, res: Response) => {
    await orgService.removePosition(req.params.id);
    return noContent(res);
  }),
  addCandidate: asyncHandler(async (req: Request, res: Response) => created(res, await orgService.addCandidate(req.params.id, req.body as CandidateDto))),
  headcount: asyncHandler(async (_req: Request, res: Response) => ok(res, await orgService.headcount())),
  funnel: asyncHandler(async (_req: Request, res: Response) => ok(res, await orgService.funnel())),

  // Skills
  listSkills: asyncHandler(async (req, res: Response) => paginated(res, await orgService.listSkills(validatedQuery(req)))),
  createSkill: asyncHandler(async (req: Request, res: Response) => created(res, await orgService.createSkill(req.body as CreateSkillDto))),
  updateSkill: asyncHandler(async (req: Request, res: Response) => ok(res, await orgService.updateSkill(req.params.id, req.body as UpdateSkillDto))),
  removeSkill: asyncHandler(async (req: Request, res: Response) => {
    await orgService.removeSkill(req.params.id);
    return noContent(res);
  }),
  skillsMatrix: asyncHandler(async (_req: Request, res: Response) => ok(res, await orgService.skillsMatrix())),

  // Skill catalog
  listSkillCatalog: asyncHandler(async (req, res: Response) => paginated(res, await orgService.listSkillCatalog(validatedQuery(req)))),
  createSkillCatalog: asyncHandler(async (req: Request, res: Response) => created(res, await orgService.createSkillCatalog(req.body as CreateSkillCatalogDto))),
  updateSkillCatalog: asyncHandler(async (req: Request, res: Response) => ok(res, await orgService.updateSkillCatalog(req.params.id, req.body as UpdateSkillCatalogDto))),
  removeSkillCatalog: asyncHandler(async (req: Request, res: Response) => {
    await orgService.removeSkillCatalog(req.params.id);
    return noContent(res);
  }),

  // Org chart & retention
  chart: asyncHandler(async (_req: Request, res: Response) => ok(res, await orgService.orgChart())),
  attritionRisk: asyncHandler(async (_req: Request, res: Response) => ok(res, await orgService.attritionRisk())),
};
