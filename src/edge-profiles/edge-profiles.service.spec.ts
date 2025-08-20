import { Test, TestingModule } from '@nestjs/testing';
import { EdgeProfilesService } from './edge-profiles.service';

describe('EdgeProfilesService', () => {
  let service: EdgeProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EdgeProfilesService],
    }).compile();

    service = module.get<EdgeProfilesService>(EdgeProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
