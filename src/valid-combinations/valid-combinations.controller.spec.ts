import { Test, TestingModule } from '@nestjs/testing';
import { ValidCombinationsController } from './valid-combinations.controller';
import { ValidCombinationsService } from './valid-combinations.service';

describe('ValidCombinationsController', () => {
  let controller: ValidCombinationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValidCombinationsController],
      providers: [ValidCombinationsService],
    }).compile();

    controller = module.get<ValidCombinationsController>(ValidCombinationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
