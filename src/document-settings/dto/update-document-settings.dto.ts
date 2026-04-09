import { PartialType } from "@nestjs/swagger";
import { CreateDocumentSettingsDto } from "./create-document-settings.dto";

export class UpdateDocumentSettingsDto extends PartialType(CreateDocumentSettingsDto) {}
