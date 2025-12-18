import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 64,
      lowercase: true,
      unique: true,
    },
    passwordHash: { type: String, required: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    age: { type: Number, min: 13, max: 120 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    phone: { type: String, match: /^[0-9]{10,15}$/ },
    city: { type: String },
    address: {
      street: { type: String },
      pinCode: { type: String, match: /^[0-9]{6}$/ },
    },
    tags: [{ type: String, minlength: 2, maxlength: 16 }],
    roles: [{ type: String, enum: ['CONSUMER', 'PROVIDER', 'ADMIN'] }],
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);
