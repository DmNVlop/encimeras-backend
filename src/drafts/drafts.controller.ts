import { Controller, Post, Get, Body, Param, HttpStatus, Res, Put } from "@nestjs/common";
import { DraftsService } from "./drafts.service";
import { CreateDraftDto } from "./dto/create-draft.dto";
import type { Response } from "express";

@Controller("drafts")
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Post()
  async save(@Body() createDraftDto: CreateDraftDto) {
    // El userId se extraería del Request si hay auth, si no, se guarda como anónimo
    const draft = await this.draftsService.createOrUpdate(createDraftDto);
    return {
      message: "Borrador guardado correctamente",
      id: draft._id,
      expirationDate: draft.expirationDate,
    };
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @Res() res: Response) {
    const result = await this.draftsService.findOne(id);

    // Si el estatus es EXPIRED_RECALCULATED, enviamos un código 200
    // pero con un objeto que el frontend debe interpretar para mostrar el aviso
    return res.status(HttpStatus.OK).json({
      status: result.status, // 'VALID' | 'EXPIRED_RECALCULATED'
      message: result.message || "Borrador recuperado",
      data: result.data, // El documento del borrador
      newPrice: result.newPrice || null,
    });
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDraftDto: CreateDraftDto, // Reutilizamos el DTO de creación
  ) {
    const draft = await this.draftsService.update(id, updateDraftDto);
    return {
      message: "Borrador actualizado con éxito",
      id: draft._id,
      expirationDate: draft.expirationDate,
    };
  }
}
