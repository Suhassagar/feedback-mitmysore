const db = require('../config/db');
const bcrypt = require('bcrypt');
const { logActivity } = require('../utils/logger');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

//=========================================================
// Add Faculty (Admin/Department)
//=========================================================
const addFaculty = async (req, res) => {
  let { faculty_id, name, email, dept_id } = req.body;
  if (faculty_id) faculty_id = faculty_id.toUpperCase();
  if (dept_id) dept_id = dept_id.toUpperCase();

  try {
    const defaultPassword = await bcrypt.hash("Fac@2007", 10);

    // Insert into global_faculty
    await db('global_faculty').insert({
      faculty_id,
      dept_id,
      name,
      email,
      password: defaultPassword
    });

    // Sync with global_directory
    await db('global_directory')
      .insert({ user_id: email, role: 'faculty', dept_id })
      .onConflict('user_id').ignore();

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding faculty:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

//=========================================================
// Faculty Registration (Public)
//=========================================================
const registerFaculty = async (req, res) => {
  let { faculty_id, name, email, dept_id } = req.body;

  if (!faculty_id || !name || !email || !dept_id)
    return res.json({ success: false, message: "All fields required" });

  faculty_id = faculty_id.toUpperCase();
  if (dept_id) dept_id = dept_id.toUpperCase();

  try {
    const deptResult = await db('department').where({ dept_id });
    if (deptResult.length === 0)
      return res.json({ success: false, message: "Department ID does not exist" });

    const fidResult = await db('global_faculty').where({ faculty_id });
    if (fidResult.length > 0)
      return res.json({ success: false, message: "Faculty ID already exists" });

    const emailResult = await db('global_faculty').where({ email });
    if (emailResult.length > 0)
      return res.json({ success: false, message: "Email already registered" });

    await db('global_pending_faculty_registrations').insert({
      faculty_id, name, email, dept_id
    });

    res.json({ success: true, message: "Registration submitted! Waiting for department approval." });
  } catch (err) {
    console.error("Error registering faculty:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

//=========================================================
// Get Pending Registrations
//=========================================================
const getPendingRegistrations = async (req, res) => {
  const { dept_id } = req.params;
  try {
    const results = await db('global_pending_faculty_registrations').where({ dept_id });
    res.json(results);
  } catch (err) {
    console.error("Error fetching pending registrations:", err);
    res.status(500).json({ error: "Database error" });
  }
};

//=========================================================
// Approve Faculty Registration
//=========================================================
const approveFaculty = async (req, res) => {
  const { id, faculty_id: req_faculty_id } = req.body;
  if (!id && !req_faculty_id) {
    return res.status(400).json({ success: false, message: "Pending ID or Faculty ID required" });
  }

  const trx = await db.transaction();
  try {
    const query = id ? { id } : { faculty_id: req_faculty_id };
    const pendingRows = await trx('global_pending_faculty_registrations').where(query);
    if (pendingRows.length === 0) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    const { id: pending_id, faculty_id, name, email, dept_id } = pendingRows[0];
    const defaultPassword = await bcrypt.hash("Fac@2007", 10);

    await trx('global_faculty').insert({
      faculty_id, dept_id, name, email, password: defaultPassword
    });

    await trx('global_directory')
      .insert({ user_id: email, role: 'faculty', dept_id })
      .onConflict('user_id').ignore();

    await trx('global_pending_faculty_registrations').where({ id: pending_id }).del();

    await trx.commit();
    res.json({ success: true, message: "Faculty approved and added." });
  } catch (err) {
    await trx.rollback();
    console.error("Error approving faculty:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

//=========================================================
// Reject Faculty Registration
//=========================================================
const rejectFaculty = async (req, res) => {
  const { id, faculty_id } = req.body;
  if (!id && !faculty_id) {
    return res.status(400).json({ success: false, message: "Pending ID or Faculty ID required" });
  }

  try {
    const query = id ? { id } : { faculty_id };
    const deletedCount = await db('global_pending_faculty_registrations').where(query).del();
    if (deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }
    res.json({ success: true, message: "Registration rejected." });
  } catch (err) {
    console.error("Error rejecting faculty:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

//=========================================================
// Update Faculty Details
//=========================================================
const updateFaculty = async (req, res) => {
  const { faculty_id } = req.params;
  const { name, email, position, dob, joining_date } = req.body;
  const dept_id = req.session.dept_id;

  try {
    const safeDob = dob || null;
    const safeJoiningDate = joining_date || null;
    await db('global_faculty')
      .where({ faculty_id, dept_id })
      .update({ name, email, position, dob: safeDob, joining_date: safeJoiningDate });
      
    res.json({ success: true, message: "Faculty updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating faculty" });
  }
};

//=========================================================
// Delete Faculty
//=========================================================
const deleteFaculty = async (req, res) => {
  const { faculty_id } = req.params;
  const dept_id = req.session.dept_id;

  const trx = await db.transaction();
  try {
    const faculty = await trx('global_faculty').where({ faculty_id, dept_id }).first();
    if (!faculty) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    await trx('global_directory').where({ user_id: faculty.email, role: 'faculty', dept_id }).del();
    await trx('global_assign').where({ faculty_id, dept_id }).del();
    await trx('global_student_feedback').where({ faculty_id, dept_id }).del();
    await trx('global_faculty_notes').where({ faculty_id, dept_id }).del();
    await trx('global_faculty').where({ faculty_id, dept_id }).del();
    
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'DELETE', 'FACULTY', `Deleted faculty member ${faculty_id}`);
    }

    await trx.commit();
    res.json({ success: true, message: "Faculty deleted permanently" });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: false, message: "Error deleting faculty" });
  }
};

//=========================================================
// Bulk Faculty Upload
//=========================================================
const bulkUploadFaculty = async (req, res) => {
  const { dept_id, faculty } = req.body;
  if (!dept_id || !faculty || !Array.isArray(faculty) || faculty.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const trx = await db.transaction();
  try {
    let insertedCount = 0;
    
    for (const f of faculty) {
      const email = f.email || `${f.faculty_id}@mit.gmail.com`;
      const password = await bcrypt.hash("Fac@2007", 10);
      
      // Upsert global_faculty
      const existing = await trx('global_faculty').where({ faculty_id: f.faculty_id }).first();
      if (!existing) {
        await trx('global_faculty').insert({
          faculty_id: f.faculty_id,
          dept_id,
          name: f.name,
          email,
          password
        });
        insertedCount++;
      }
      
      // Upsert global_directory
      await trx('global_directory')
        .insert({ user_id: email, role: 'faculty', dept_id })
        .onConflict('user_id').ignore();
    }

    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'UPLOAD', 'FACULTY', `Bulk uploaded ${insertedCount} faculty members`);
    }

    await trx.commit();
    res.json({ message: "Bulk upload successful", inserted: insertedCount });
  } catch (err) {
    await trx.rollback();
    console.error("Bulk Faculty Upload Error:", err);
    res.status(500).json({ error: "Failed to upload faculty" });
  }
};

//=========================================================
// Update Own Profile (Faculty)
//=========================================================
const updateOwnProfile = async (req, res) => {
  const faculty_id = req.session.faculty_id;
  const dept_id = req.session.dept_id;
  const { email, password, joining_date, dob } = req.body;
  
  if (!faculty_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  const trx = await db.transaction();
  try {
    const currentFaculty = await trx('global_faculty').where({ faculty_id, dept_id }).first();
    if (!currentFaculty) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    const updateData = {};
    if (joining_date !== undefined) updateData.joining_date = joining_date || null;
    if (dob !== undefined) updateData.dob = dob || null;
    
    let emailChanged = false;
    let oldEmail = currentFaculty.email;
    
    if (email && email !== oldEmail) {
      const existing = await trx('global_faculty').where({ email }).first();
      if (existing) {
        await trx.rollback();
        return res.json({ success: false, message: "Email is already in use." });
      }
      updateData.email = email;
      emailChanged = true;
    }
    
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    if (Object.keys(updateData).length > 0) {
      await trx('global_faculty').where({ faculty_id, dept_id }).update(updateData);
      
      if (emailChanged) {
        await trx('global_directory').where({ user_id: oldEmail, role: 'faculty' }).update({ user_id: email });
      }
    }
    
    await trx.commit();
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    await trx.rollback();
    console.error("Error updating own profile:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

//=========================================================
// Upload Temporary Profile Picture (Returns URLs, no DB save)
//=========================================================
const uploadTempProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'faculty_profiles', tags: ['temp_upload'] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const rawUrl = uploadResult.secure_url;
    
    // User's defined comprehensive prompt
    const rawAiPrompt = `Create a highly professional LinkedIn profile photograph of the person in the reference image. Preserve the person's exact facial identity, facial structure, natural skin tone, eyes, nose, jawline, hairstyle, and overall appearance. Do not change or beautify the face excessively. The person must remain clearly recognizable as the same individual. Professional appearance: Corporate, confident, approachable, and intelligent expression Natural subtle smile or calm confident expression Upright posture Head and shoulders / upper-chest framing Direct eye contact with the camera Professional modern business attire: well-fitted dark navy or charcoal blazer with a clean white or light-blue shirt No tie unless it naturally suits the appearance Neat, professional hairstyle Clean and natural grooming Photography: Premium corporate headshot photography Soft, natural studio lighting Realistic facial shadows Sharp focus on the eyes and face Natural skin texture and realistic detail Subtle background depth and blur Clean neutral light-gray or soft off-white background Balanced exposure and natural skin tones Professional DSLR/mirrorless camera appearance 85mm portrait-lens aesthetic Photorealistic and natural, not AI-looking Preserve fine facial details without unnecessary ultra-high-resolution detail Composition: Centered face Face occupying approximately 55–65% of the frame Square 1:1 composition Optimized specifically for a LinkedIn profile picture Enough space around the head and shoulders for circular/profile cropping Clean, minimal corporate composition Output optimization: Maintain maximum practical visual quality while avoiding unnecessarily high resolution Target approximately 800×800 pixels Use JPEG/JPG format Use high-quality JPEG compression around 85–90% Target a final file size of less than 1 MB Do not sacrifice facial clarity, sharpness, skin texture, or identity to reduce file size Prioritize efficient JPEG compression rather than reducing image quality excessively Avoid: cartoon/anime appearance, excessive skin smoothing, plastic skin, facial reshaping, unrealistic eyes, altered facial identity, exaggerated smile, dramatic cinematic lighting, excessive contrast, flashy clothing, distracting backgrounds, text, logos, watermarks, sunglasses, heavy makeup, artificial beauty filters, excessive sharpening, compression artifacts, pixelation, blurry facial details. The final result should look like a premium professional corporate headshot, while being technically optimized as a high-quality, lightweight LinkedIn profile image under 1 MB.`;
    
    // Remove all commas and special punctuation to prevent Cloudinary URL parser from breaking
    const safeAiPrompt = rawAiPrompt.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    const aiUrl = cloudinary.url(uploadResult.public_id, {
      secure: true,
      transformation: [
        { width: 800, height: 800, crop: "fill", gravity: "face" },
        { effect: "gen_restore" },
        { effect: `gen_background_replace:prompt_${safeAiPrompt}` }
      ]
    });

    res.json({ success: true, rawUrl, aiUrl, public_id: uploadResult.public_id });
  } catch (err) {
    console.error("Error uploading temporary picture:", err);
    res.status(500).json({ success: false, message: "Failed to upload image", details: err.message });
  }
};

//=========================================================
// Save Final Profile Picture to Database
//=========================================================
const saveProfilePicture = async (req, res) => {
  try {
    const { faculty_id, dept_id } = req.session;
    const { finalUrl } = req.body;

    if (!finalUrl) {
      return res.status(400).json({ success: false, message: "No URL provided" });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!finalUrl.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
      return res.status(403).json({ success: false, message: "Invalid image source. Untrusted URL detected." });
    }

    // Fetch old URL before updating
    const currentFaculty = await db('global_faculty').where({ faculty_id, dept_id }).first();
    const oldUrl = currentFaculty?.profile_picture_url;

    await db('global_faculty')
      .where({ faculty_id, dept_id })
      .update({ profile_picture_url: finalUrl });

    // Clean up old image from Cloudinary
    if (oldUrl && oldUrl !== finalUrl) {
      const match = oldUrl.match(/faculty_profiles\/([^/?.]+)/);
      if (match) {
        const oldPublicId = `faculty_profiles/${match[1]}`;
        cloudinary.uploader.destroy(oldPublicId).catch(e => console.error("Failed to delete old image", e));
      }
    }

    // Remove temp tag from the new image to make it permanent
    const newMatch = finalUrl.match(/faculty_profiles\/([^/?.]+)/);
    if (newMatch) {
      const newPublicId = `faculty_profiles/${newMatch[1]}`;
      cloudinary.uploader.remove_tag('temp_upload', [newPublicId]).catch(e => console.error("Failed to remove temp tag", e));
    }

    res.json({ success: true, url: finalUrl });
  } catch (err) {
    console.error("Error saving profile picture:", err);
    res.status(500).json({ success: false, message: "Failed to save image" });
  }
};

//=========================================================
// Delete Temporary Profile Picture
//=========================================================
const deleteTempProfilePicture = async (req, res) => {
  try {
    const { public_id } = req.body;
    if (public_id) {
      await cloudinary.uploader.destroy(public_id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting temp picture:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  addFaculty,
  registerFaculty,
  getPendingRegistrations,
  approveFaculty,
  rejectFaculty,
  updateFaculty,
  deleteFaculty,
  bulkUploadFaculty,
  updateOwnProfile,
  uploadTempProfilePicture,
  saveProfilePicture,
  deleteTempProfilePicture
};
