import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const updateAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB successfully.');
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin@123', salt);

        const result = await mongoose.connection.collection('food_admins').updateOne(
            { email: 'admi@gmail.com' },
            { 
                $set: { 
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    name: 'Admin',
                    phone: '9999999999',
                    servicesAccess: ['food'],
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        console.log('Result for admi@gmail.com:', result);

        const result2 = await mongoose.connection.collection('food_admins').updateOne(
            { email: 'admin@gmail.com' },
            { 
                $set: { 
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    name: 'Admin',
                    phone: '9999999999',
                    servicesAccess: ['food'],
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        console.log('Result for admin@gmail.com:', result2);

        console.log('Successfully updated admin credentials.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

updateAdmin();
