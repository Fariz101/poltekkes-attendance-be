import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import 'multer'

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    // Inisialisasi konfigurasi Cloudinary saat service dipanggil
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File | Buffer,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload_stream = cloudinary.uploader.upload_stream(
        { folder: folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!);
        },
      );

      // Handle apakah input berupa Buffer murni (seperti QR code) atau File Multer
      const buffer = Buffer.isBuffer(file) ? file : file.buffer;
      upload_stream.end(buffer);
    });
  }

  async deleteFile(url: string) {
    try {
      // Ekstrak public_id beserta folder (misal: "qr-students/filename")
      const slices = url.split('/');
      const filenameWithExtension = slices[slices.length - 1];
      const folderName = slices[slices.length - 2];
      const [filename] = filenameWithExtension.split('.');
      
      const publicId = `${folderName}/${filename}`;
      return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new InternalServerErrorException('Gagal menghapus file dari Cloudinary');
    }
  }
}