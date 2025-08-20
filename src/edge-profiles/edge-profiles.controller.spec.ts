import { Test, TestingModule } from '@nestjs/testing';
import { EdgeProfilesController } from './edge-profiles.controller';
import { EdgeProfilesService } from './edge-profiles.service';

describe('EdgeProfilesController', () => {
  let controller: EdgeProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EdgeProfilesController],
      providers: [EdgeProfilesService],
    }).compile();

    controller = module.get<EdgeProfilesController>(EdgeProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
