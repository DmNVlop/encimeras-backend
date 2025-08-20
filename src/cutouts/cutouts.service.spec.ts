import { Test, TestingModule } from '@nestjs/testing';
import { CutoutsService } from './cutouts.service';

describe('CutoutsService', () => {
  let service: CutoutsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CutoutsService],
    }).compile();

    service = module.get<CutoutsService>(CutoutsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
