import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "./schemas/customer.schema";
import { User } from "../users/schemas/users.schema";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { BatchAssignUsersDto } from "./dto/batch-assign-sales.dto";
import { GlobalSettingsService } from "../settings/global-settings.service";
import { Role } from "../auth/enums/role.enum";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private settingsService: GlobalSettingsService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, factoryId: string, userId: string, userRoles?: string[]): Promise<Customer> {
    const multiSales = await this.settingsService.getMultiSalesPerCustomer();

    const isSales = userRoles?.includes(Role.SALES) && !userRoles?.includes(Role.ADMIN);

    // SALES can only assign themselves — ignore any assignedUserIds from the request
    let assignedUserIds = isSales ? [userId] : (createCustomerDto.assignedUserIds || []);

    if (!multiSales && assignedUserIds.length > 1) {
      throw new ForbiddenException("Multi-sales per customer is disabled. Only one sales user can be assigned.");
    }

    const createdCustomer = new this.customerModel({
      ...createCustomerDto,
      factoryId,
      createdBy: userId,
      assignedUserIds,
    });
    return createdCustomer.save();
  }

  async findAll(factoryId: string): Promise<Customer[]> {
    return this.customerModel.find({ factoryId, isActive: true }).exec();
  }

  async findAllForOwner(factoryId: string): Promise<Customer[]> {
    return this.customerModel.find({ factoryId, isActive: true }).exec();
  }

  async findAllForSales(factoryId: string, userId: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        factoryId,
        isActive: true,
        $or: [{ createdBy: userId }, { assignedUserIds: userId }],
      })
      .exec();
  }

  async findAllForManager(factoryId: string, managerId: string): Promise<Customer[]> {
    const salesIds = await this.userModel
      .find({ managerId: managerId, roles: "SALES" })
      .select("_id")
      .lean()
      .exec();
    const salesIdList = salesIds.map((u) => u._id.toString());

    return this.customerModel
      .find({
        factoryId,
        isActive: true,
        $or: [{ createdBy: managerId }, { createdBy: { $in: salesIdList } }, { assignedUserIds: managerId }, { assignedUserIds: { $in: salesIdList } }],
      })
      .exec();
  }

  async findOneForManager(id: string, factoryId: string, managerId: string): Promise<Customer> {
    const salesIds = await this.userModel
      .find({ managerId: managerId, roles: "SALES" })
      .select("_id")
      .lean()
      .exec();
    const salesIdList = salesIds.map((u) => u._id.toString());

    const customer = await this.customerModel
      .findOne({
        _id: id,
        factoryId,
        isActive: true,
        $or: [{ createdBy: managerId }, { createdBy: { $in: salesIdList } }, { assignedUserIds: managerId }, { assignedUserIds: { $in: salesIdList } }],
      })
      .exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found or access denied`);
    }
    return customer;
  }

  async findAllForUser(factoryId: string, userId: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        factoryId,
        isActive: true,
        platformUserId: userId,
      })
      .exec();
  }

  async findOne(id: string, factoryId: string): Promise<Customer> {
    const customer = await this.customerModel.findOne({ _id: id, factoryId }).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return customer;
  }

  async findOneForOwner(id: string, factoryId: string): Promise<Customer> {
    const customer = await this.customerModel.findOne({ _id: id, factoryId, isActive: true }).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return customer;
  }

  async findOneForSales(id: string, factoryId: string, userId: string): Promise<Customer> {
    const customer = await this.customerModel
      .findOne({
        _id: id,
        factoryId,
        $or: [{ createdBy: userId }, { assignedUserIds: userId }],
      })
      .exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found or access denied`);
    }
    return customer;
  }

  async findOneForUser(id: string, factoryId: string, userId: string): Promise<Customer> {
    const customer = await this.customerModel
      .findOne({
        _id: id,
        factoryId,
        platformUserId: userId,
      })
      .exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found or access denied`);
    }
    return customer;
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customerModel.findById(id).exec();
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, factoryId: string, currentUserId: string, currentUserRoles: string[]): Promise<Customer> {
    const customer = await this.customerModel.findOne({ _id: id, factoryId, isActive: true }).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    if (currentUserRoles.includes("USER") && !currentUserRoles.includes("ADMIN") && customer.platformUserId?.toString() !== currentUserId) {
      throw new ForbiddenException("You can only update your own profile");
    }

    const isSales = currentUserRoles.includes(Role.SALES) && !currentUserRoles.includes(Role.ADMIN);
    const isOwner = currentUserRoles.includes(Role.OWNER) && !currentUserRoles.includes(Role.ADMIN);

    const createdById = customer.createdBy?.toString();
    const assignedIds = customer.assignedUserIds?.map((uid) => uid.toString()) ?? [];

    if (isSales && createdById !== currentUserId && !assignedIds.includes(currentUserId)) {
      throw new ForbiddenException("You can only update customers assigned to you");
    }

    if (isOwner && createdById !== currentUserId && !assignedIds.includes(currentUserId)) {
      throw new ForbiddenException("You can only update customers assigned to you");
    }

    const sanitizedDto = { ...updateCustomerDto };
    if (isSales) {
      delete sanitizedDto.assignedUserIds;
    }

    if (!isSales && sanitizedDto.assignedUserIds) {
      const multiSales = await this.settingsService.getMultiSalesPerCustomer();
      if (!multiSales && sanitizedDto.assignedUserIds.length > 1) {
        throw new ForbiddenException("Multi-sales per customer is disabled. Only one sales user can be assigned.");
      }
    }

    const updatedCustomer = await this.customerModel.findByIdAndUpdate(id, sanitizedDto, { new: true }).exec();

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return updatedCustomer;
  }

  async remove(id: string, factoryId: string, currentUserId?: string, currentUserRoles?: string[]): Promise<void> {
    const isSales = currentUserRoles?.includes(Role.SALES) && !currentUserRoles?.includes(Role.ADMIN);
    if (isSales && currentUserId) {
      const customer = await this.customerModel.findOne({ _id: id, factoryId, isActive: true }).exec();
      if (!customer) {
        throw new NotFoundException(`Customer with ID "${id}" not found`);
      }

      const createdById = customer.createdBy?.toString();
      const assignedIds = customer.assignedUserIds?.map((uid) => uid.toString()) ?? [];
      if (createdById !== currentUserId && !assignedIds.includes(currentUserId)) {
        throw new ForbiddenException("You can only delete customers assigned to you");
      }
    }

    const result = await this.customerModel.updateOne({ _id: id, factoryId, isActive: true }, { isActive: false }).exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
  }

  async linkToUser(id: string, userId: string, factoryId: string): Promise<Customer> {
    const customer = await this.customerModel.findOneAndUpdate({ _id: id, factoryId }, { platformUserId: userId }, { new: true }).exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return customer;
  }

  async batchAssignSales(dto: BatchAssignUsersDto, factoryId: string): Promise<{ updatedCount: number }> {
    const salesUsers = await this.userModel.find({ _id: { $in: dto.assignedUserIds }, roles: Role.SALES }).exec();

    if (salesUsers.length !== dto.assignedUserIds.length) {
      const foundIds = salesUsers.map((u) => (u._id as unknown as string).toString());
      const missing = dto.assignedUserIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Sales users not found or do not have SALES role: ${missing.join(", ")}`);
    }

    const multiSales = await this.settingsService.getMultiSalesPerCustomer();
    if (!multiSales && dto.assignedUserIds.length > 1) {
      throw new ForbiddenException("Multi-sales per customer is disabled. Only one sales user can be assigned.");
    }

    const result = await this.customerModel
      .updateMany({ _id: { $in: dto.customerIds }, factoryId, isActive: true }, { $set: { assignedUserIds: dto.assignedUserIds } })
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException("No active customers found with the given IDs and factory");
    }

    return { updatedCount: result.matchedCount };
  }

  async batchRemove(customerIds: string[], factoryId: string): Promise<{ deletedCount: number }> {
    const result = await this.customerModel.updateMany({ _id: { $in: customerIds }, factoryId, isActive: true }, { $set: { isActive: false } }).exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException("No active customers found with the given IDs and factory");
    }

    return { deletedCount: result.matchedCount };
  }
}
