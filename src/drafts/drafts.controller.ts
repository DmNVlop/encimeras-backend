import { Controller, Post, Get, Body, Param, HttpStatus, Res, Put, UseGuards, Delete } from "@nestjs/common";
import { DraftsService } from "./drafts.service";
import { CreateDraftDto } from "./dto/create-draft.dto";
import type { Response } from "express";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { GetUser } from "src/auth/decorators/get-user.decorator";

@Controller("drafts")
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllActive(@GetUser() user: any) {
    return this.draftsService.findAllActive(user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async save(@Body() createDraftDto: CreateDraftDto, @GetUser() user: any) {
    const draft = await this.draftsService.createOrUpdate(createDraftDto, user.userId);
    return {
      message: "Borrador guardado correctamente",
      id: draft._id,
      expirationDate: draft.expirationDate,
    };
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getOne(@Param("id") id: string, @Res() res: Response, @GetUser() user: any) {
    const result = await this.draftsService.findOne(id, user.userId);

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
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() updateDraftDto: CreateDraftDto, // Reutilizamos el DTO de creación
    @GetUser() user: any,
  ) {
    const draft = await this.draftsService.update(id, updateDraftDto, user.userId);
    return {
      message: "Borrador actualizado con éxito",
      id: draft._id,
      expirationDate: draft.expirationDate,
    };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async delete(@Param("id") id: string, @GetUser() user: any) {
    await this.draftsService.delete(id, user.userId);
    return {
      message: "Borrador eliminado correctamente",
    };
  }
}
