import { Test, TestingModule } from '@nestjs/testing';
import { PriceConfigsController } from './price-configs.controller';
import { PriceConfigsService } from './price-configs.service';

describe('PriceConfigsController', () => {
  let controller: PriceConfigsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceConfigsController],
      providers: [PriceConfigsService],
    }).compile();

    controller = module.get<PriceConfigsController>(PriceConfigsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
