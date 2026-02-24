import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "./schemas/customer.schema";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private customerModel: Model<CustomerDocument>) {}

  async create(createCustomerDto: CreateCustomerDto, factoryId: string): Promise<Customer> {
    const createdCustomer = new this.customerModel({
      ...createCustomerDto,
      factoryId,
    });
    return createdCustomer.save();
  }

  async findAll(factoryId: string): Promise<Customer[]> {
    return this.customerModel.find({ factoryId, isActive: true }).exec();
  }

  async findOne(id: string, factoryId: string): Promise<Customer> {
    const customer = await this.customerModel.findOne({ _id: id, factoryId }).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return customer;
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customerModel.findById(id).exec();
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, factoryId: string, currentUserId: string, currentUserRoles: string[]): Promise<Customer> {
    const customer = await this.findOne(id, factoryId);

    // Validation for USER role: can only update their own linked customer profile
    if (currentUserRoles.includes("USER") && !currentUserRoles.includes("ADMIN") && customer.platformUserId?.toString() !== currentUserId) {
      throw new ForbiddenException("You can only update your own profile");
    }

    const updatedCustomer = await this.customerModel.findByIdAndUpdate(id, updateCustomerDto, { new: true }).exec();

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
}
