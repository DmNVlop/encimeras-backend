import { Test, TestingModule } from '@nestjs/testing';
import { CutoutsController } from './cutouts.controller';
import { CutoutsService } from './cutouts.service';

describe('CutoutsController', () => {
  let controller: CutoutsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CutoutsController],
      providers: [CutoutsService],
    }).compile();

    controller = module.get<CutoutsController>(CutoutsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
