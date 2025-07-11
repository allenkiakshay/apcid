import path from 'path';
import fs from 'fs';

export async function GET() {
    try {
        const directoryPath = path.join(process.cwd(), 'uploads/QPS');
        
        const files = fs.readdirSync(directoryPath);
        if (files.length === 0) {
            throw new Error('No files found in the directory');
        }
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(directoryPath, randomFile);

        const fileBuffer = fs.readFileSync(filePath);
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', 'inline; filename="Question Paper.pdf"');
        return new Response(fileBuffer, {
            status: 200,
            headers: headers,
        });
    } catch (error) {
        console.error('Error fetching the file:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
