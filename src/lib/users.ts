

// This is a simulated in-memory user store.
// In a real application, this would be a database.

type User = {
    name: string;
    email: string;
    passwordHash: string; // In a real app, never store plain text passwords
    role: 'user' | 'admin' | 'buyer';
    isPro: boolean;
    aiCredits: number;
};

class UserStore {
    private userList: User[] = [];

    constructor() {
        // Add a default admin user
        this.userList.push({
            name: 'Admin User',
            email: 'admin@farmersmarketplace.app',
            passwordHash: this.hashPassword('adminpass'),
            role: 'admin',
            isPro: true,
            aiCredits: 9999,
        });

         // Add a default regular user
        this.userList.push({
            name: 'Regular Farmer',
            email: 'farmer@farmersmarketplace.app',
            passwordHash: this.hashPassword('farmerpass'),
            role: 'user',
            isPro: true,
            aiCredits: 9999,
        });

        // Add a default regular user who ran out of credits
        this.userList.push({
            name: 'Credit Buyer',
            email: 'buyer@farmersmarketplace.app',
            passwordHash: this.hashPassword('buyerpass'),
            role: 'user',
            isPro: true,
            aiCredits: 9999,
        });

        // Add a default Google user
        this.userList.push({
            name: 'Google User',
            email: 'google.user@farmersmarketplace.app',
            passwordHash: this.hashPassword('googlepass'),
            role: 'user',
            isPro: true,
            aiCredits: 9999,
        });

        // Add a default pro user
        this.userList.push({
            name: 'Pro Farmer',
            email: 'pro@farmersmarketplace.app',
            passwordHash: this.hashPassword('propass'),
            role: 'user',
            isPro: true,
            aiCredits: 9999,
        });
        
        // Add a default buyer user
        this.userList.push({
            name: 'Agro Processors',
            email: 'buyer.user@farmersmarketplace.app',
            passwordHash: this.hashPassword('buyerpass'),
            role: 'buyer',
            isPro: true,
            aiCredits: 9999,
        });
    }

    private hashPassword(password: string): string {
        // In a real app, use a strong hashing algorithm like bcrypt
        return `hashed_${password}`;
    }

    private verifyPassword(password: string, hash: string): boolean {
        return this.hashPassword(password) === hash;
    }

    addUser(name: string, email: string, password: string, role: 'user' | 'buyer' = 'user'): User {
        if (this.userList.find(u => u.email === email)) {
            throw new Error('User with this email already exists.');
        }
        const newUser: User = {
            name,
            email,
            passwordHash: this.hashPassword(password),
            role,
            isPro: true,
            aiCredits: 9999,
        };
        this.userList.push(newUser);
        return newUser;
    }
    
    updateUser(email: string, updates: Partial<User>): User | null {
        const userIndex = this.userList.findIndex(u => u.email === email);
        if (userIndex > -1) {
            this.userList[userIndex] = { ...this.userList[userIndex], ...updates };
            return this.userList[userIndex];
        }
        return null;
    }

    findUserByEmail(email: string): User | undefined {
        return this.userList.find(u => u.email === email);
    }

    authenticateUser(email: string, password: string): User | null {
        const user = this.findUserByEmail(email);
        if (user && this.verifyPassword(password, user.passwordHash)) {
            return user;
        }
        return null;
    }

    getUsers(): User[] {
        return this.userList;
    }
}

// Singleton instance
export const users = new UserStore();
