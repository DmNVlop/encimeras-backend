import { Global, Module } from "@nestjs/common";
import { RoleHierarchyService } from "./services/role-hierarchy.service";
import { RolesGuard } from "./guards/roles.guard";

/**
 * Módulo global que expone RoleHierarchyService y RolesGuard
 * a toda la aplicación sin necesidad de importarlo en cada módulo.
 */
@Global()
@Module({
  providers: [RoleHierarchyService, RolesGuard],
  exports: [RoleHierarchyService, RolesGuard],
})
export class AuthSharedModule {}
