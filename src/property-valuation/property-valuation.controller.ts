import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PropertyValuationService } from './property-valuation.service';
import { CondominiumPropertyValuationDTO } from 'src/common/dto/condominiumPropertyValuation.dto';

@Controller('property-valuation')
export class PropertyValuationController {
  constructor(
    private readonly propertyValuationService: PropertyValuationService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('condominium')
  condominium(@Body() data: CondominiumPropertyValuationDTO) {
    return this.propertyValuationService.condominium(data);
  }
}
