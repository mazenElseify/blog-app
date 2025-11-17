import mongoose, { Document, Schema} from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema: Schema = new Schema<IUser>(
    {
        name: {
            type: String,
            requiered: true
        },
        email: { 
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    });

    const User = mongoose.model<IUser>('User', userSchema);
export { User };