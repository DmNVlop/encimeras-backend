import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "./schemas/customer.schema";
import { User } from "../users/schemas/users.schema";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { BatchAssignSalesDto } from "./dto/batch-assign-sales.dto";
import { GlobalSettingsService } from "../settings/global-settings.service";
import { Role } from "../auth/enums/role.enum";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private settingsService: GlobalSettingsService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, factoryId: string, userId: string): Promise<Customer> {
    const multiSales = await this.settingsService.getMultiSalesPerCustomer();
    if (!multiSales && createCustomerDto.allowedSalesUserIds && createCustomerDto.allowedSalesUserIds.length > 1) {
      throw new ForbiddenException("Multi-sales per customer is disabled. Only one sales user can be assigned.");
    }

    const createdCustomer = new this.customerModel({
      ...createCustomerDto,
      factoryId,
      createdBy: userId,
    });
    return createdCustomer.save();
  }

  async findAll(factoryId: string): Promise<Customer[]> {
    return this.customerModel.find({ factoryId, isActive: true }).exec();
  }

  async findAllForSales(factoryId: string, userId: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        factoryId,
        isActive: true,
        $or: [{ createdBy: userId }, { allowedSalesUserIds: userId }],
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

  async findOneForSales(id: string, factoryId: string, userId: string): Promise<Customer> {
    const customer = await this.customerModel
      .findOne({
        _id: id,
        factoryId,
        $or: [{ createdBy: userId }, { allowedSalesUserIds: userId }],
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
    const customer = await this.findOne(id, factoryId);

    if (currentUserRoles.includes("USER") && !currentUserRoles.includes("ADMIN") && customer.platformUserId?.toString() !== currentUserId) {
      throw new ForbiddenException("You can only update your own profile");
    }

    const isSales = currentUserRoles.includes("SALES") && !currentUserRoles.includes("ADMIN");
    if (isSales && customer.createdBy !== currentUserId && !customer.allowedSalesUserIds?.includes(currentUserId)) {
      throw new ForbiddenException("You can only update customers assigned to you");
    }

    const sanitizedDto = { ...updateCustomerDto };
    if (isSales) {
      delete sanitizedDto.allowedSalesUserIds;
    }

    if (!isSales && sanitizedDto.allowedSalesUserIds) {
      const multiSales = await this.settingsService.getMultiSalesPerCustomer();
      if (!multiSales && sanitizedDto.allowedSalesUserIds.length > 1) {
        throw new ForbiddenException("Multi-sales per customer is disabled. Only one sales user can be assigned.");
      }
    }

    const updatedCustomer = await this.customerModel.findByIdAndUpdate(id, sanitizedDto, { new: true }).exec();

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return updatedCustomer;
  }

  async remove(id: string, factoryId: string): Promise<void> {
    const result = await this.customerModel.updateOne({ _id: id, factoryId }, { isActive: false }).exec();

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

  async batchAssignSales(dto: BatchAssignSalesDto, factoryId: string): Promise<{ updatedCount: number }> {
    const salesUsers = await this.userModel.find({ _id: { $in: dto.salesUserIds }, roles: Role.SALES }).exec();

    if (salesUsers.length !== dto.salesUserIds.length) {
      const foundIds = salesUsers.map((u) => (u._id as unknown as string).toString());
      const missing = dto.salesUserIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Sales users not found or do not have SALES role: ${missing.join(", ")}`);
    }

    const multiSales = await this.settingsService.getMultiSalesPerCustomer();
    if (!multiSales && dto.salesUserIds.length > 1) {
      throw new ForbiddenException("Multi-sales per customer is disabled. Only one sales user can be assigned.");
    }

    const result = await this.customerModel
      .updateMany({ _id: { $in: dto.customerIds }, factoryId, isActive: true }, { $set: { allowedSalesUserIds: dto.salesUserIds } })
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
