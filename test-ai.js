import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    try {
        console.log('Testing key:', process.env.GEMINI_API_KEY ? 'FOUND' : 'MISSING');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Hi');
        console.log('Result:', result.response.text());
        console.log('✅ KEY IS VALID!');
    } catch (e) {
        console.error('❌ KEY TEST FAILED');
        console.error('Error Code:', e.status || e.code);
        console.error('Error Message:', e.message);
        if (e.message.includes('403')) {
            console.error('DIAGNOSIS: Google is actively blocking this key (403 Forbidden).');
        }
    }
}

test();
