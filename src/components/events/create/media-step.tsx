'use client';

import { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  AlertCircle,
  Upload,
  X,
  Plus,
  Trash2,
  Clock,
  User,
  Image as ImageIcon,
  Camera
} from 'lucide-react';
import Image from 'next/image';

export function MediaStep() {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    control
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'agenda'
  });

  const [uploading, setUploading] = useState(false);
  const bannerImage = watch('bannerImage');
  const gallery = watch('gallery') || [];

  // Banner image upload
  const onBannerDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploading(true);
      try {
        // Simulate upload - in real app, upload to storage service
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockUrl = `/api/placeholder/1600/900?t=${Date.now()}`;
        setValue('bannerImage', mockUrl);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    }
  }, [setValue]);

  // Gallery images upload
  const onGalleryDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploading(true);
      try {
        // Simulate upload - in real app, upload to storage service
        await new Promise(resolve => setTimeout(resolve, 1500));
        const newImages = acceptedFiles.map((_, index) =>
          `/api/placeholder/400/300?t=${Date.now()}&i=${index}`
        );
        setValue('gallery', [...gallery, ...newImages]);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    }
  }, [gallery, setValue]);

  const bannerDropzone = useDropzone({
    onDrop: onBannerDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const galleryDropzone = useDropzone({
    onDrop: onGalleryDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 10,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeGalleryImage = (index: number) => {
    const newGallery = gallery.filter((_: string, i: number) => i !== index);
    setValue('gallery', newGallery);
  };

  const addAgendaItem = () => {
    append({
      time: '',
      title: '',
      description: '',
      speaker: '',
    });
  };

  const removeAgendaItem = (index: number) => {
    remove(index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 sm:p-8 space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-4 text-white">
          Media & Agenda
        </h2>
        <p className="text-gray-400 mb-6">
          Add visual elements and create a detailed schedule for your event.
        </p>
      </div>

      {/* Banner Image */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-white">
          Banner Image *
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Upload a high-quality banner image. Recommended size: 1600x900px, max 5MB.
        </p>

        {bannerImage ? (
          <div className="relative rounded-xl overflow-hidden">
            <Image
              src={bannerImage}
              alt="Event banner"
              width={800}
              height={450}
              className="w-full h-64 object-cover"
            />
            <button
              type="button"
              onClick={() => setValue('bannerImage', '')}
              className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            {...bannerDropzone.getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              bannerDropzone.isDragActive
                ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10'
                : 'border-gray-700/50 hover:border-gray-600/50 bg-gray-800/30'
            }`}
          >
            <input {...bannerDropzone.getInputProps()} />
            <div className="space-y-4">
              {uploading ? (
                // Removed spinner per request; keep simple state
                <Upload className="w-12 h-12 text-violet-400 mx-auto" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              )}
              <div>
                <p className="text-lg font-semibold text-white">
                  {uploading ? 'Uploading...' : 'Drop your banner image here'}
                </p>
                <p className="text-gray-400">
                  or click to browse files
                </p>
              </div>
            </div>
          </div>
        )}

        {errors.bannerImage && (
          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.bannerImage.message as string}
          </p>
        )}
      </div>

      {/* Gallery */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-white">
          Gallery (Optional)
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Add additional images to showcase your event. Max 10 images.
        </p>

        {gallery.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {gallery.map((image: string, index: number) => (
              <div key={index} className="relative group">
                <Image
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  width={200}
                  height={150}
                  className="w-full h-32 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {gallery.length < 10 && (
          <div
            {...galleryDropzone.getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
              galleryDropzone.isDragActive
                ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10'
                : 'border-gray-700/50 hover:border-gray-600/50 bg-gray-800/30'
            }`}
          >
            <input {...galleryDropzone.getInputProps()} />
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">
              {uploading ? 'Uploading...' : 'Add gallery images'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Drag & drop or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Event Agenda */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Event Agenda (Optional)
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Create a detailed schedule of your event activities.
            </p>
          </div>
          <button
            type="button"
            onClick={addAgendaItem}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {fields.length > 0 && (
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-white">
                    Agenda Item {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(index)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-300">
                      Time *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        {...register(`agenda.${index}.time`)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-300">
                      Speaker (Optional)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        {...register(`agenda.${index}.speaker`)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                        placeholder="Speaker name"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium mb-3 text-gray-300">
                    Title *
                  </label>
                  <input
                    type="text"
                    {...register(`agenda.${index}.title`)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                    placeholder="Activity or session title"
                  />
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium mb-3 text-gray-300">
                    Description
                  </label>
                  <textarea
                    {...register(`agenda.${index}.description`)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all resize-none"
                    placeholder="Brief description of this agenda item"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {fields.length === 0 && (
          <div className="text-center py-12 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 font-medium">No agenda items yet</p>
            <p className="text-gray-500 text-sm mt-1">Click &quot;Add Item&quot; to get started</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
