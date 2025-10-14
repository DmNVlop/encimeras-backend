import { Test, TestingModule } from '@nestjs/testing';
import { PriceConfigsService } from './price-configs.service';

describe('PriceConfigsService', () => {
  let service: PriceConfigsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceConfigsService],
    }).compile();

    service = module.get<PriceConfigsService>(PriceConfigsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
