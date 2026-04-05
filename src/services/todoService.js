const todoRepository = require('../repositories/todoRepository');
const logger = require('../utils/logger');

// Default status for new todos
const DEFAULT_STATUS = 'open';

/**
 * Creates a new todo item for a user
 * @param {Object} todoData - Todo creation data
 * @param {string} todoData.title - Todo title (required)
 * @param {string} todoData.description - Todo description
 * @param {string} todoData.due_date - Due date in ISO format
 * @param {number} todoData.user_id - ID of the user creating the todo
 * @returns {Promise<Object>} Created todo object with generated ID
 */
const createTodo = async (todoData) => {
  try {
    const todoWithDefaults = {
      ...todoData,
      status: DEFAULT_STATUS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createdTodo = await todoRepository.create(todoWithDefaults);
    
    logger.info(`Todo created with ID: ${createdTodo.id}`);
    return createdTodo;
  } catch (error) {
    logger.error('Error in todoService.createTodo:', error);
    throw error;
  }
};

module.exports = {
  createTodo
};