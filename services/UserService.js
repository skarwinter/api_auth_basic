import db from '../dist/db/models/index.js';
import bcrypt from 'bcrypt';

const createUser = async (userData) => {
    const {
      name,
      email,
      password,
      password_second,
      cellphone
    } = userData;
  
    if (password !== password_second) {
      return {
        code: 400,
        message: 'Passwords do not match'
      };
    }

    const user = await db.User.findOne({
      where: {
        email: email
      }
    });
  
    if (user) {
      return {
        code: 400,
        message: 'User already exists'
      };
    }
  
    const encryptedPassword = await bcrypt.hash(password, 10);
  
    const newUser = await db.User.create({
      name,
      email,
      password: encryptedPassword,
      cellphone,
      status: true
    });
  
    return {
      code: 200,
      message: 'User created successfully with ID: ' + newUser.id,
    };
};

const getUserById = async (id) => {
    return {
        code: 200,
        message: await db.User.findOne({
            where: {
                id: id,
                status: true,
            }
        })
    };
}

const updateUser = async (req) => {
    const user = db.User.findOne({
        where: {
            id: req.params.id,
            status: true,
        }
    });
    const payload = {};
    payload.name = req.body.name ?? user.name;
    payload.password = req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password;
    payload.cellphone = req.body.cellphone ?? user.cellphone;
    await db.User.update(payload, {
        where: {
            id: req.params.id
        }

    });
    return {
        code: 200,
        message: 'User updated successfully'
    };
}

const deleteUser = async (id) => {
    /* await db.User.destroy({
        where: {
            id: id
        }
    }); */
    const user = db.User.findOne({
        where: {
            id: id,
            status: true,
        }
    });
    await  db.User.update({
        status: false
    }, {
        where: {
            id: id
        }
    });
    return {
        code: 200,
        message: 'User deleted successfully'
    };
}

const getAllUsers = async () => {
    const users = await db.User.findAll({
        where: {
            status: true
        }
    });
    return {
        code: 200,
        message: users
    }
}

const findUsers = async (queryParams) => {
    const { status, name, before, after } = queryParams;

    let sql = `
    SELECT DISTINCT u.* 
    FROM Users u
    LEFT JOIN Sessions s ON u.id = s.id_user 
    WHERE 1=1 
  `; 

    let whereConditions = [];
    if (status === 'false' || status === "0") {
      whereConditions.push('u.`status` = false');
    } else if (status === 'true' || status === "1") {
      whereConditions.push('u.`status` = true');
    }

    if (name) {
      whereConditions.push(`u.name LIKE '%${name}%'`);
    }
    if (before) {
      whereConditions.push(`s.createdAt <= '${before}'`);
    }
    if (after) {
      whereConditions.push(`s.createdAt >= '${after}'`);
    }
    if (whereConditions.length > 0) {
      sql += ` AND ${whereConditions.join(' AND ')}`;
    }
    try {
      const [rows] = await db.sequelize.query(sql);
      return {
        code: 200,
        message: rows,
      };
    } catch (error) {
      console.error('Error executing query:', error);
      return {
        code: 500,
        message: 'Internal server error',
      };
    }
}

const bulkCreate = async (usersToCreate) => {
    if (!Array.isArray(usersToCreate)) {
      return {
        code: 400,
        message: 'Invalid request body. Please provide an array of users.'
      };
    }
  
    let successfulUsers = 0;
    let failedUsers = 0;
  
    for (const user of usersToCreate) {
      try {
        const response = await createUser(user);
        if (response.code === 200) {
          successfulUsers++;
        } else {
          failedUsers++;
        }
      } catch (error) {
        console.error('Error creating users:', error);
        failedUsers++;
      }
    }
  
    let message = 'Users created: ' + successfulUsers + '\n';
    message += 'Users not created: ' + failedUsers;
  
    return {
      code: 200,
      message: message,
    };
};

export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllUsers,
    findUsers,
    bulkCreate,
}