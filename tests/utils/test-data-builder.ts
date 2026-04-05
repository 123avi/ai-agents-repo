import { faker } from '@faker-js/faker';

const TODO_STATUSES = ['open', 'done'] as const;
type TodoStatus = typeof TODO_STATUSES[number];

interface UserRegistrationData {
  email: string;
  password: string;
}

interface TodoRequestData {
  title: string;
  description?: string;
  due_date?: string;
  status?: TodoStatus;
}

/**
 * Test data builder utility for generating consistent test data
 * across integration and unit tests
 */
export class TestDataBuilder {
  /**
   * Creates a valid user registration payload with random data
   * @returns UserRegistrationData - User registration data
   */
  static createUser(): UserRegistrationData {
    return {
      email: faker.internet.email().toLowerCase(),
      password: this.createStrongPassword()
    };
  }

  /**
   * Creates a valid todo request payload with random data
   * @param overrides - Optional field overrides
   * @returns TodoRequestData - Todo creation data
   */
  static createTodoRequest(overrides: Partial<TodoRequestData> = {}): TodoRequestData {
    const defaultData: TodoRequestData = {
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      description: faker.lorem.paragraph({ min: 1, max: 3 }),
      due_date: faker.date.future().toISOString(),
      status: faker.helpers.arrayElement(TODO_STATUSES)
    };

    return { ...defaultData, ...overrides };
  }

  /**
   * Creates a minimal valid todo request (title only)
   * @returns TodoRequestData - Minimal todo data
   */
  static createMinimalTodoRequest(): TodoRequestData {
    return {
      title: faker.lorem.sentence({ min: 3, max: 6 })
    };
  }

  /**
   * Creates an invalid todo request for validation testing
   * @param invalidationType - Type of validation error to trigger
   * @returns Partial<TodoRequestData> - Invalid todo data
   */
  static createInvalidTodoRequest(invalidationType: 'empty_title' | 'invalid_status' | 'invalid_date'): Partial<TodoRequestData> {
    const baseData = this.createTodoRequest();

    switch (invalidationType) {
      case 'empty_title':
        return { ...baseData, title: '' };
      case 'invalid_status':
        return { ...baseData, status: 'invalid_status' as TodoStatus };
      case 'invalid_date':
        return { ...baseData, due_date: 'not-a-date' };
      default:
        return baseData;
    }
  }

  /**
   * Creates multiple todo requests for bulk testing
   * @param count - Number of todos to create
   * @param overrides - Common overrides for all todos
   * @returns TodoRequestData[] - Array of todo data
   */
  static createMultipleTodos(count: number, overrides: Partial<TodoRequestData> = {}): TodoRequestData[] {
    return Array.from({ length: count }, () => this.createTodoRequest(overrides));
  }

  /**
   * Creates a todo update payload with partial data
   * @param fields - Fields to include in update
   * @returns Partial<TodoRequestData> - Update payload
   */
  static createTodoUpdate(fields: ('title' | 'description' | 'status' | 'due_date')[]): Partial<TodoRequestData> {
    const fullTodo = this.createTodoRequest();
    const update: Partial<TodoRequestData> = {};

    fields.forEach(field => {
      if (field in fullTodo) {
        update[field] = fullTodo[field];
      }
    });

    return update;
  }

  /**
   * Creates a strong password meeting security requirements
   * @returns string - Strong password
   */
  private static createStrongPassword(): string {
    const lowercase = faker.string.alpha({ length: 3, casing: 'lower' });
    const uppercase = faker.string.alpha({ length: 3, casing: 'upper' });
    const numbers = faker.string.numeric(3);
    const symbols = faker.helpers.arrayElements(['!', '@', '#', '$', '%'], 2).join('');
    
    const password = lowercase + uppercase + numbers + symbols;
    return faker.helpers.shuffle(password.split('')).join('');
  }

  /**
   * Creates user data with specific email domain for testing
   * @param domain - Email domain to use
   * @returns UserRegistrationData - User with specific domain
   */
  static createUserWithDomain(domain: string): UserRegistrationData {
    const username = faker.internet.userName().toLowerCase();
    return {
      email: `${username}@${domain}`,
      password: this.createStrongPassword()
    };
  }

  /**
   * Creates todo data with specific status
   * @param status - Todo status to set
   * @returns TodoRequestData - Todo with specific status
   */
  static createTodoWithStatus(status: TodoStatus): TodoRequestData {
    return this.createTodoRequest({ status });
  }

  /**
   * Creates todo data with due date in specific timeframe
   * @param timeframe - 'past' | 'today' | 'future'
   * @returns TodoRequestData - Todo with specific due date
   */
  static createTodoWithDueDate(timeframe: 'past' | 'today' | 'future'): TodoRequestData {
    let dueDate: Date;
    
    switch (timeframe) {
      case 'past':
        dueDate = faker.date.past();
        break;
      case 'today':
        dueDate = new Date();
        break;
      case 'future':
        dueDate = faker.date.future();
        break;
      default:
        dueDate = faker.date.future();
    }

    return this.createTodoRequest({ due_date: dueDate.toISOString() });
  }
}