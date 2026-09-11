USE college_feedback_system;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS admin;
CREATE TABLE `admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `admin` (`id`, `password`, `updated_at`, `username`) values (1, '$2b$10$v4WOjdfF28XFEpXbKG1GtutgDu6WgrQGXvYymDsQ9aJRAgyIZsTH6', '2026-08-25 10:11:43.000', 'admin@mit'), (2, '$2b$10$RehrgZ6.dIPa1jmtNXUnjunBNWZjmLc5sTcl1O.xSThLAkX3X9uUW', '2026-08-29 13:10:18.000', 'admin');

DROP TABLE IF EXISTS department;
CREATE TABLE `department` (
  `dept_id` varchar(20) NOT NULL,
  `dept_name` varchar(50) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `username` varchar(50) NOT NULL,
  `ai_summary` text DEFAULT NULL,
  `hod_password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`dept_id`),
  UNIQUE KEY `dept_name` (`dept_name`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `department` (`ai_summary`, `dept_id`, `dept_name`, `hod_password`, `is_active`, `password`, `username`) values ('### Executive Summary\nBased on the provided student remarks, here is the analytical summary for the selected scope:\n\n**Strengths:**\n* **Curriculum Design:** The structure of the technical subjects is highly appreciated by students.\n* **Faculty Engagement:** Multiple remarks highlight strong engagement during Q&A sessions.\n\n**Areas of Improvement:**\n* **Lab Infrastructure:** A recurring theme is the need for computer upgrades, specifically citing slow performance.\n* **Practical Implementation:** Students are requesting more hands-on, practical sessions for core technical subjects.\n\n**Key Action Items:**\n1. Initiate hardware performance audits in the Computer Labs.\n2. Review the syllabus to allocate more time to practical experiments.\n3. Encourage faculty to maintain the high quality of interactive theoretical teaching.', 'CSE', 'COMPUTER SCIENCE AND ENGINEERING', '$2b$10$lYipc4o/PE92M64YVSM.7.Ml94hMxa59lRiPIcSSx99XoticSqAVa', 1, '$2b$10$/QCC3rI6IgcE3kuTCJVM3.0xdXigrW07s6fEkLvRhWpVVEXKlHAGq', 'cse_hod'), (NULL, 'ECE', 'ELECTRONICS AND COMMUNICATION ENGINEERING', NULL, 1, '$2b$10$Wz6na1JPblgVWC90.7/3EuRCk8ZfRZDMe8n1bUy2/vFJfNegnfgee', 'ece_hod');

DROP TABLE IF EXISTS global_directory;
CREATE TABLE `global_directory` (
  `user_id` varchar(100) NOT NULL,
  `role` enum('student','faculty') NOT NULL,
  `dept_id` varchar(20) NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_directory` (`dept_id`, `role`, `user_id`) values ('CSE', 'student', '4MH24CS414'), ('CSE', 'faculty', 'akshataha.m@mit.edu.in'), ('CSE', 'faculty', 'ambhika.k.b@mit.edu.in'), ('CSE', 'faculty', 'amrutha.b@mit.edu.in'), ('CSE', 'faculty', 'bhavya.h.s@mit.edu.in'), ('CSE', 'faculty', 'gayathri.s@mit.edu.in'), ('CSE', 'faculty', 'harish.h@mit.edu.in'), ('CSE', 'faculty', 'hratiknaydu@gmail.com'), ('CSE', 'faculty', 'jayalakshmi.y.t@mit.edu.in'), ('CSE', 'faculty', 'lokesh.t.p@mit.edu.in'), ('CSE', 'faculty', 'malashree@mit.edu.in'), ('CSE', 'faculty', 'meenakshi.h@mit.edu.in'), ('CSE', 'faculty', 'michelle.dsouza@mit.edu.in'), ('CSE', 'faculty', 'monika.h.d@mit.edu.in'), ('CSE', 'faculty', 'nethravathi.j@mit.edu.in'), ('CSE', 'faculty', 'pallavi.y@mit.edu.in'), ('CSE', 'faculty', 'prakruthi.b.n@mit.edu.in'), ('CSE', 'faculty', 'prakruthi.s@mit.edu.in'), ('CSE', 'faculty', 'ramya.m.p@mit.edu.in'), ('CSE', 'faculty', 'sagar.s@mit.edu.in'), ('CSE', 'faculty', 'santosh.e@mit.edu.in'), ('CSE', 'faculty', 'suhas@gmail.com'), ('CSE', 'faculty', 'syeda@mit.edu.in'), ('CSE', 'faculty', 'uzma@mit.edu.in'), ('CSE', 'faculty', 'varshini.m.acharya@mit.edu.in');

DROP TABLE IF EXISTS global_course;
CREATE TABLE `global_course` (
  `course_id` int(11) NOT NULL AUTO_INCREMENT,
  `course_code` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `course_name` varchar(200) NOT NULL,
  `sem` tinyint(4) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`course_code`,`dept_id`),
  UNIQUE KEY `course_id` (`course_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_course` (`course_code`, `course_id`, `course_name`, `dept_id`, `is_active`, `sem`) values ('BCS803', 18, 'Internship', 'cse', 1, 8), ('M23BBIOK401', 1, 'Biology for Computer Engineer', 'cse', 1, 6), ('M23BCS402', 2, 'Analysis and Design of Algorithms', 'cse', 1, 4), ('M23BCS403', 3, 'Microcontrollers', 'cse', 1, 4), ('M23BCS404', 4, 'Database Management Systems', 'cse', 1, 4), ('M23BCS405', 5, 'Artificial Intelligence', 'cse', 1, 4), ('M23BCS407B', 7, 'Linear Algebra', 'cse', 1, 4), ('M23BCS601', 10, 'Full Stack Development', 'cse', 1, 6), ('M23BCS602', 11, 'Machine Learning', 'cse', 1, 6), ('M23BCS603A', 12, 'Blockchain Technology', 'cse', 1, 6), ('M23BCS605', 14, 'Project Phase I', 'cse', 1, 6), ('M23BCS607B', 16, 'DevOps', 'cse', 1, 6), ('M23BCSL406', 6, 'Analysis and Design of Algorithms Laboratory', 'cse', 1, 4), ('M23BCSL606', 15, 'Machine Learning Laboratory', 'cse', 1, 6), ('M23BNSK410 / M23BDIPM411', 9, 'National Skills Qualification and Digital Professional Skills', 'cse', 1, 4), ('M23BNSK608', 17, 'Kannada Kali Learning', 'cse', 1, 6), ('M23BUHK409', 8, 'Universal Human Values', 'cse', 1, 4), ('M23BXX604', 13, 'Open Elective Course', 'cse', 1, 6);

DROP TABLE IF EXISTS global_faculty;
CREATE TABLE `global_faculty` (
  `f_id` int(11) NOT NULL AUTO_INCREMENT,
  `faculty_id` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `position` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `joining_date` date DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `last_active` datetime DEFAULT NULL,
  `profile_picture_url` text DEFAULT NULL,
  PRIMARY KEY (`faculty_id`,`dept_id`),
  UNIQUE KEY `f_id` (`f_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_faculty` (`dept_id`, `dob`, `email`, `f_id`, `faculty_id`, `is_active`, `joining_date`, `last_active`, `name`, `password`, `position`, `profile_picture_url`) values ('cse', NULL, 'hratiknaydu@gmail.com', 1, '4MH23CS198', 1, NULL, NULL, 'hratik naydu', '$2b$10$YnZJ6xDGy3l6AaDqrLRTnunKnU4V0rTCs7J.pFN5OMBr3ipGBZRkC', NULL, NULL), ('cse', NULL, 'santosh.e@mit.edu.in', 2, 'MH23CS224', 1, NULL, NULL, 'Santosh E', '$2b$10$bQ91xeQ8Rd/Lz9pBnDcp7uIsB0HzbLc4seUCwWUh4QlYFNdIyTz2m', 'Assistant Professor', NULL), ('cse', '1983-02-09 00:00:00.000', 'harish.h@mit.edu.in', 3, 'MH23CS225', 1, '2020-06-18 00:00:00.000', NULL, 'Harish H', '$2b$10$Dm5BHRjVT9EokgxLUBvzn.M9Ji8blhl1jpP2O4EmB0VJKNFSqsqTS', 'Assistant Professor', 'https://res.cloudinary.com/dep3ok4l/image/upload/e_gen_background_replace:prompt_Create_a_highly_professional_LinkedIn_profile_photograph_of_the_person_in_the_reference_image_Preserve_the_person_s_exact_facial_identity_facial_structure_natural_skin_tone_eyes_nose_jawline_hairstyle_and_overall_appearance_Do_not_change_or_beautify_the_face_excessively_The_person_must_remain_clearly_recognizable_as_the_same_individual_Professional_appearance_Corporate_confident_approachable_and_intelligent_expression_Natural_subtle_smile_or_calm_confident_expression_Upright_posture_Head_and_shoulders_upper_chest_framing_Direct_eye_contact_with_the_camera_Professional_modern_business_attire_well_fitted_dark_navy_or_charcoal_blazer_with_a_clean_white_or_light_blue_shirt_No_tie_unless_it_naturally_suits_the_appearance_Neat_professional_hairstyle_Clean_and_natural_grooming_Photography_Premium_corporate_headshot_photography_Soft_natural_studio_lighting_Realistic_facial_shadows_Sharp_focus_on_the_eyes_and_face_Natural_skin_texture_and_realistic_detail_Subtle_background_depth_and_blur_Clean_neutral_light_gray_or_soft_off_white_background_Balanced_exposure_and_natural_skin_tones_Professional_DSLR_mirrorless_camera_appearance_85mm_portrait_lens_aesthetic_Photorealistic_and_natural_not_AI_looking_Preserve_fine_facial_details_without_unnecessary_ultra_high_resolution_detail_Composition_Centered_face_Face_occupying_approximately_55_65_of_the_frame_Square_1_1_composition_Optimized_specifically_for_a_LinkedIn_profile_picture_Enough_space_around_the_head_and_shoulders_for_circular_profile_cropping_Clean_minimal_corporate_composition_Output_optimization_Maintain_maximum_practical_visual_quality_while_avoiding_unnecessarily_high_resolution_Target_approximately_800_800_pixels_Use_JPEG_JPG_format_Use_high_quality_JPEG_compression_around_85_90_Target_a_final_file_size_of_less_than_1_MB_Do_not_sacrifice_facial_clarity_sharpness_skin_texture_or_identity_to_reduce_file_size_Prioritize_efficient_JPEG_compression_rather_than_reducing_image_quality_excessively_Avoid_cartoon_anime_appearance_excessive_skin_smoothing_plastic_skin_facial_reshaping_unrealistic_eyes_altered_facial_identity_exaggerated_smile_dramatic_cinematic_lighting_excessive_contrast_flashy_clothing_distracting_backgrounds_text_logos_watermarks_sunglasses_heavy_makeup_artificial_beauty_filters_excessive_sharpening_compression_artifacts_pixelation_blurry_facial_details_The_final_result_should_look_like_a_premium_professional_corporate_headshot_while_being_technically_optimized_as_a_high_quality_lightweight_LinkedIn_profile_image_under_1_MB/v1/faculty_profiles/k42ncfd14vpfjhcdx390?_a=BAMCr6X00'), ('cse', NULL, 'lokesh.t.p@mit.edu.in', 5, 'MH23CS227', 1, NULL, NULL, 'Lokesh T P', '$2b$10$7UUk/tO132MBpj4iwrVS6ugYCe4u9VwzW6kqjvA26HP/MsWY6hCFa', NULL, NULL), ('cse', NULL, 'akshataha.m@mit.edu.in', 6, 'MH23CS228', 1, NULL, NULL, 'Akshataha M', '$2b$10$Ws7yrv36nDtcfrMztivNMOCYuTV2bRB9XFIgmfMfhvDfLyvx9hzvi', NULL, NULL), ('cse', NULL, 'malashree@mit.edu.in', 7, 'MH23CS229', 1, NULL, NULL, 'Malashree', '$2b$10$m1C41wRTnePejvyasYnWe.8ewvtC37kYXF.kgDN8nSfJN93yV4Gea', NULL, NULL), ('cse', NULL, 'bhavya.h.s@mit.edu.in', 8, 'MH23CS230', 1, NULL, NULL, 'Bhavya H S', '$2b$10$mXzbuK9EahVsucENUd4KoOihoJuuq.H1PwzPLZIPkNI7QQF8xQDdq', NULL, NULL), ('cse', NULL, 'ambhika.k.b@mit.edu.in', 9, 'MH23CS231', 1, NULL, NULL, 'Ambhika K B', '$2b$10$D1lF6ch9l75IJUsDgnLUZe9FZ3GXI3rpgUAlxcqFNIx7Vs.KcxEpG', NULL, NULL), ('cse', NULL, 'michelle.dsouza@mit.edu.in', 10, 'MH23CS232', 1, NULL, NULL, 'Michelle Dsouza', '$2b$10$SA3Wyn78e6no6U7Q1YLADOfoDQxGMe51GgpsfKtvKEjE2qG5yNm2e', NULL, NULL), ('cse', NULL, 'prakruthi.s@mit.edu.in', 11, 'MH23CS233', 1, NULL, NULL, 'Prakruthi S', '$2b$10$4CWEQUvxkShS899xbmmBb.O1jjpC6LrTfkWRAWhl4LOsNB2J95rDO', NULL, NULL), ('cse', NULL, 'meenakshi.h@mit.edu.in', 12, 'MH23CS234', 1, NULL, NULL, 'Meenakshi H', '$2b$10$SvCvI3k.kERvNOM6lm1ezeVTWP.Wc/ywsZWakHfPKQG5Pt9BkH.o.', NULL, NULL), ('cse', NULL, 'pallavi.y@mit.edu.in', 13, 'MH23CS235', 1, NULL, NULL, 'Pallavi Y', '$2b$10$Us/FagJXJj1edaR4K2CNB.qIpCwXTOIzVLDKdh7.8II.GS2FIkU9q', NULL, NULL), ('cse', NULL, 'gayathri.s@mit.edu.in', 14, 'MH23CS236', 1, NULL, NULL, 'Gayathri S', '$2b$10$7Ce2fh9NEU.zWV2HoP/smekBjgFsAHMejYnTRFgH2CemHWJUHytOW', NULL, NULL), ('cse', NULL, 'ramya.m.p@mit.edu.in', 15, 'MH23CS237', 1, NULL, NULL, 'Ramya M P', '$2b$10$OzgnfQmDNt5CEatBE9F28en/cQl.3ScatQCHgfFk46u3.1YoS3wfy', NULL, NULL), ('cse', NULL, 'syeda@mit.edu.in', 16, 'MH23CS238', 1, NULL, NULL, 'Syeda', '$2b$10$llr5Qy8OT1UVpOPDb9or1umSymPajLKsbC9bLXzY9mrux6KHOWwIi', NULL, NULL), ('cse', NULL, 'nethravathi.j@mit.edu.in', 17, 'MH23CS239', 1, NULL, NULL, 'Nethravathi J', '$2b$10$tPrwkSeuDl2JW7PEfqN.MekzwjixDf7sEzMMvmh0u6IDM1o547fDW', NULL, NULL), ('cse', NULL, 'jayalakshmi.y.t@mit.edu.in', 18, 'MH23CS240', 1, NULL, NULL, 'Jayalakshmi Y T', '$2b$10$ZQ2PcshUMoTTXIuXsJJbRuZoHPKOCNXbPC0fyZVS6mj7KJivTB4yu', NULL, NULL), ('cse', NULL, 'uzma@mit.edu.in', 19, 'MH23CS241', 1, NULL, NULL, 'Uzma', '$2b$10$P2DBTgHONNEAqGOV0N7oF.31/QUEijlzjctYzxAV5/6oKZXoxHBEa', NULL, NULL), ('cse', NULL, 'varshini.m.acharya@mit.edu.in', 20, 'MH23CS242', 1, NULL, NULL, 'Varshini M Acharya', '$2b$10$Hk6.8BDf4eHfxU3eDr8TBuk/4MS.ga21ZLeB/LnzThzo8s.WRAOGe', NULL, NULL), ('cse', NULL, 'monika.h.d@mit.edu.in', 21, 'MH23CS243', 1, NULL, NULL, 'Monika H D', '$2b$10$vldEApWALAnEeS.r/eHKwOfnQa5R8.U2iTH1TvwS6oSfgReQETwee', NULL, NULL), ('cse', NULL, 'prakruthi.b.n@mit.edu.in', 22, 'MH23CS244', 1, NULL, NULL, 'Prakruthi B N', '$2b$10$mFtkDWA3Q/Mdr8bbU.8F/OZbcSXpuXvFHvHHPV0Y.q2WmMRS3rz/K', NULL, NULL), ('cse', NULL, 'amrutha.b@mit.edu.in', 23, 'MH23CS245', 1, NULL, NULL, 'Amrutha B', '$2b$10$VrVGX.6wzjj5dUwCowFOyOrT/FiOVBdKqPnMsA64DTf8M//YKnQTy', NULL, NULL), ('cse', NULL, 'sagar.s@mit.edu.in', 24, 'MH23CS246', 1, NULL, NULL, 'Sagar S', '$2b$10$b8Str02ygXT2OrIKvWJiTu15OfQSBrOl.5uuAsliIln.H83ZAC83O', NULL, NULL), ('cse', NULL, 'suhas@gmail.com', 25, 'MH23CS667', 1, NULL, NULL, 'Suhas j sagar', '$2b$10$S.Y1Rs1jMP1TkAmSlNXuR.h9m.v/EydzLuI3hdZyvXI0JNq6hcbxW', NULL, NULL);

DROP TABLE IF EXISTS global_students;
CREATE TABLE `global_students` (
  `usn` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `sem` tinyint(4) DEFAULT NULL,
  `section` enum('A','B','C','D','E','F','G','H') DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `feedback_given` enum('missing','pending','done') DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`usn`,`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_students` (`dept_id`, `email`, `feedback_given`, `name`, `section`, `sem`, `session_id`, `usn`) values ('CSE', 'suhassagar44@gmail.com', 'missing', 'suhas sagar', 'A', 6, 'SBYFLQE', '4MH24CS414');

DROP TABLE IF EXISTS global_assign;
CREATE TABLE `global_assign` (
  `assign_id` int(11) NOT NULL AUTO_INCREMENT,
  `faculty_id` varchar(50) NOT NULL,
  `course_code` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `sem` tinyint(4) NOT NULL,
  `section` enum('A','B','C','D','E','F','G','H') NOT NULL,
  PRIMARY KEY (`faculty_id`,`course_code`,`dept_id`,`sem`,`section`),
  UNIQUE KEY `assign_id` (`assign_id`),
  KEY `fk_assign_faculty` (`faculty_id`,`dept_id`),
  KEY `fk_assign_course` (`course_code`,`dept_id`),
  CONSTRAINT `fk_assign_course` FOREIGN KEY (`course_code`, `dept_id`) REFERENCES `global_course` (`course_code`, `dept_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assign_faculty` FOREIGN KEY (`faculty_id`, `dept_id`) REFERENCES `global_faculty` (`faculty_id`, `dept_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_assign` (`assign_id`, `course_code`, `dept_id`, `faculty_id`, `section`, `sem`) values (1, 'M23BCS601', 'cse', 'MH23CS224', 'A', 6), (2, 'M23BCS602', 'cse', 'MH23CS225', 'A', 6), (4, 'M23BCS607B', 'cse', 'MH23CS229', 'C', 6), (5, 'M23BXX604', 'cse', 'MH23CS225', 'C', 4), (6, 'M23BCS405', 'cse', 'MH23CS225', 'B', 3), (7, 'M23BCS607B', 'CSE', 'MH23CS225', 'A', 6);

DROP TABLE IF EXISTS global_sessions;
CREATE TABLE `global_sessions` (
  `session_id` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `sem` tinyint(4) DEFAULT NULL,
  `section` enum('A','B','C','D','E','F','G','H') DEFAULT NULL,
  `status` enum('active','ended') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `ai_summary` text DEFAULT NULL,
  PRIMARY KEY (`session_id`,`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_sessions` (`ai_summary`, `created_at`, `dept_id`, `section`, `sem`, `session_id`, `status`) values (NULL, '2026-09-01 20:41:01.000', 'CSE', 'A', 6, 'SBYFLQE', 'active');

DROP TABLE IF EXISTS global_feedback_questions;
CREATE TABLE `global_feedback_questions` (
  `question_id` int(11) NOT NULL AUTO_INCREMENT,
  `dept_id` varchar(50) NOT NULL,
  `question_text` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `question_heading` varchar(255) DEFAULT 'General Feedback',
  PRIMARY KEY (`question_id`,`dept_id`),
  UNIQUE KEY `question_id` (`question_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_feedback_questions` (`created_at`, `dept_id`, `question_heading`, `question_id`, `question_text`) values ('2026-08-13 14:57:45.000', 'CSE', 'Teaching Effectiveness', 1, 'Clarity & Effectiveness of Explanations'), ('2026-08-13 14:57:45.000', 'CSE', 'Teaching Effectiveness', 2, 'Depth of Subject Knowledge Demonstrated'), ('2026-08-13 14:57:45.000', 'CSE', 'Teaching Effectiveness', 3, 'Use of Relevant Examples & Applications'), ('2026-08-13 14:57:45.000', 'CSE', 'Teaching Effectiveness', 4, 'Ability to Maintain Student Interest & Engagement'), ('2026-08-13 14:57:45.000', 'CSE', 'Communication Skills', 5, 'Clarity & Articulation in Communication'), ('2026-08-13 14:57:45.000', 'CSE', 'Communication Skills', 6, 'Use of Simple & Understandable Language'), ('2026-08-13 14:57:45.000', 'CSE', 'Communication Skills', 7, 'Appropriate Pace of Delivery (Not Too Fast/Slow)'), ('2026-08-13 14:57:45.000', 'CSE', 'Communication Skills', 8, 'Encouragement for Student Participation & Interaction'), ('2026-08-13 14:57:45.000', 'CSE', 'Assessment and Feedback', 9, 'Fairness & Transparency in Evaluations'), ('2026-08-13 14:57:45.000', 'CSE', 'Assessment and Feedback', 10, 'Timely Announcement of Internal Assessment Marks'), ('2026-08-13 14:57:45.000', 'CSE', 'Assessment and Feedback', 11, 'Completion of Syllabus as Planned'), ('2026-08-13 14:57:45.000', 'CSE', 'Assessment and Feedback', 12, 'Constructive Feedback to Students through Evaluation'), ('2026-08-13 14:57:45.000', 'CSE', 'Availability and Support', 13, 'Availability during College Hours'), ('2026-08-13 14:57:45.000', 'CSE', 'Availability and Support', 14, 'Provision of Adequate Study Materials & Academic Resources'), ('2026-08-13 14:57:45.000', 'CSE', 'Availability and Support', 15, 'Willingness to Extend Additional Academic Support when Needed'), ('2026-09-11 21:49:53.000', 'ECE', 'Teaching Effectiveness', 16, 'Clarity & Effectiveness of Explanations'), ('2026-09-11 21:49:53.000', 'ECE', 'Teaching Effectiveness', 17, 'Depth of Subject Knowledge Demonstrated'), ('2026-09-11 21:49:53.000', 'ECE', 'Teaching Effectiveness', 18, 'Use of Relevant Examples & Applications'), ('2026-09-11 21:49:53.000', 'ECE', 'Teaching Effectiveness', 19, 'Ability to Maintain Student Interest & Engagement'), ('2026-09-11 21:49:53.000', 'ECE', 'Communication Skills', 20, 'Clarity & Articulation in Communication'), ('2026-09-11 21:49:53.000', 'ECE', 'Communication Skills', 21, 'Use of Simple & Understandable Language'), ('2026-09-11 21:49:53.000', 'ECE', 'Communication Skills', 22, 'Appropriate Pace of Delivery (Not Too Fast/Slow)'), ('2026-09-11 21:49:53.000', 'ECE', 'Communication Skills', 23, 'Encouragement for Student Participation & Interaction'), ('2026-09-11 21:49:53.000', 'ECE', 'Assessment and Feedback', 24, 'Fairness & Transparency in Evaluations'), ('2026-09-11 21:49:53.000', 'ECE', 'Assessment and Feedback', 25, 'Timely Announcement of Internal Assessment Marks'), ('2026-09-11 21:49:53.000', 'ECE', 'Assessment and Feedback', 26, 'Completion of Syllabus as Planned'), ('2026-09-11 21:49:53.000', 'ECE', 'Assessment and Feedback', 27, 'Constructive Feedback to Students through Evaluation'), ('2026-09-11 21:49:53.000', 'ECE', 'Availability and Support', 28, 'Availability during College Hours'), ('2026-09-11 21:49:53.000', 'ECE', 'Availability and Support', 29, 'Provision of Adequate Study Materials & Academic Resources'), ('2026-09-11 21:49:53.000', 'ECE', 'Availability and Support', 30, 'Willingness to Extend Additional Academic Support when Needed');

DROP TABLE IF EXISTS global_student_feedback;
CREATE TABLE `global_student_feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `faculty_id` varchar(50) NOT NULL,
  `course_id` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `question_id` int(11) DEFAULT NULL,
  `rating` tinyint(4) DEFAULT NULL,
  `session_id` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_analytics` (`session_id`,`faculty_id`,`course_id`,`rating`),
  KEY `fk_fb_faculty` (`faculty_id`,`dept_id`),
  KEY `fk_fb_session` (`session_id`,`dept_id`),
  KEY `fk_gsf_course_99` (`course_id`),
  KEY `fk_gsf_question_99` (`question_id`,`dept_id`),
  CONSTRAINT `fk_fb_faculty` FOREIGN KEY (`faculty_id`, `dept_id`) REFERENCES `global_faculty` (`faculty_id`, `dept_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fb_session` FOREIGN KEY (`session_id`, `dept_id`) REFERENCES `global_sessions` (`session_id`, `dept_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feedback_course` FOREIGN KEY (`course_id`) REFERENCES `global_course` (`course_code`) ON DELETE CASCADE,
  CONSTRAINT `fk_gsf_course_99` FOREIGN KEY (`course_id`) REFERENCES `global_course` (`course_code`) ON DELETE CASCADE,
  CONSTRAINT `fk_gsf_question_99` FOREIGN KEY (`question_id`, `dept_id`) REFERENCES `global_feedback_questions` (`question_id`, `dept_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS global_session_remarks;
CREATE TABLE `global_session_remarks` (
  `remark_id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `remark_text` text NOT NULL,
  `sentiment_score` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`remark_id`),
  KEY `fk_rem_session` (`session_id`,`dept_id`),
  CONSTRAINT `fk_rem_session` FOREIGN KEY (`session_id`, `dept_id`) REFERENCES `global_sessions` (`session_id`, `dept_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS global_faculty_notes;
CREATE TABLE `global_faculty_notes` (
  `note_id` int(11) NOT NULL AUTO_INCREMENT,
  `faculty_id` varchar(50) NOT NULL,
  `dept_id` varchar(50) NOT NULL,
  `sender_type` enum('department','faculty') DEFAULT 'department',
  `note_text` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`note_id`),
  KEY `fk_notes_faculty` (`faculty_id`,`dept_id`),
  CONSTRAINT `fk_notes_faculty` FOREIGN KEY (`faculty_id`, `dept_id`) REFERENCES `global_faculty` (`faculty_id`, `dept_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_faculty_notes` (`created_at`, `dept_id`, `faculty_id`, `is_read`, `note_id`, `note_text`, `sender_type`) values ('2026-08-16 12:19:47.000', 'CSE', 'MH23CS225', 1, 7, '33aaa1c2b6fbfe079ab768cda4329705:5b746bdb058cb912ef464bb81ea447f3', 'department'), ('2026-08-16 12:20:02.000', 'CSE', 'MH23CS224', 1, 8, '5019e7eba286feed1e27ca9247a6149b:13199a6a37137870e82df8a04a067643', 'department');

DROP TABLE IF EXISTS global_department_activity_logs;
CREATE TABLE `global_department_activity_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `dept_id` varchar(50) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `entity` varchar(50) NOT NULL DEFAULT 'SYSTEM',
  `description` text NOT NULL,
  `ip_address` varchar(100) DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into `global_department_activity_logs` (`action_type`, `created_at`, `dept_id`, `description`, `device_info`, `entity`, `ip_address`, `log_id`) values ('LOGIN', '2026-08-13 12:41:54.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 1), ('LOGOUT', '2026-08-13 12:53:42.000', 'cse', 'Logged out of the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 2), ('LOGIN', '2026-08-13 13:04:27.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 3), ('UPLOAD', '2026-08-13 13:14:41.000', 'cse', 'Bulk uploaded 24 faculty members', 'Brave on Windows', 'FACULTY', '127.0.0.1 (Localhost)', 4), ('DELETE', '2026-08-13 13:21:06.000', 'cse', 'Deleted faculty member MH23CS223', 'Brave on Windows', 'FACULTY', '127.0.0.1 (Localhost)', 5), ('UPLOAD', '2026-08-13 13:22:55.000', 'cse', 'Bulk uploaded 60 students', 'Brave on Windows', 'STUDENT', '127.0.0.1 (Localhost)', 6), ('DELETE', '2026-08-13 13:23:14.000', 'cse', 'Deleted student 4MY20CS301', 'Brave on Windows', 'STUDENT', '127.0.0.1 (Localhost)', 7), ('LOGOUT', '2026-08-13 13:28:52.000', 'cse', 'Logged out of the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 8), ('LOGIN', '2026-08-13 14:35:01.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 9), ('LOGOUT', '2026-08-13 14:36:41.000', 'cse', 'Logged out of the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 10), ('UPLOAD', '2026-08-13 14:38:17.000', 'cse', 'Bulk uploaded 18 subjects', 'Brave on Windows', 'COURSE', '127.0.0.1 (Localhost)', 11), ('CREATE', '2026-08-13 14:53:46.000', 'cse', 'Assigned M23BCS601 (Sem 6, Sec A) to MH23CS224', 'Brave on Android', 'ASSIGNMENT', '127.0.0.1 (Localhost)', 12), ('UPLOAD', '2026-08-13 14:57:45.000', 'cse', 'Bulk uploaded 15 feedback questions', 'Brave on Android', 'COURSE', '127.0.0.1 (Localhost)', 13), ('CREATE', '2026-08-13 14:58:41.000', 'cse', 'Assigned M23BCS602 (Sem 6, Sec A) to MH23CS225', 'Brave on Windows', 'ASSIGNMENT', '127.0.0.1 (Localhost)', 14), ('CREATE', '2026-08-13 14:59:14.000', 'cse', 'Assigned M23BCS404 (Sem 6, Sec A) to MH23CS226', 'Brave on Windows', 'ASSIGNMENT', '127.0.0.1 (Localhost)', 15), ('CREATE', '2026-08-13 14:59:47.000', 'cse', 'Assigned M23BCS607B (Sem 6, Sec C) to MH23CS229', 'Brave on Windows', 'ASSIGNMENT', '127.0.0.1 (Localhost)', 16), ('CREATE', '2026-08-13 15:00:07.000', 'cse', 'Created feedback session S2K31GN for Sem 6 Sec A', 'Brave on Windows', 'SESSION', '127.0.0.1 (Localhost)', 17), ('CREATE', '2026-08-13 15:00:27.000', 'cse', 'Created feedback session SDIB82W for Sem 6 Sec A', 'Brave on Windows', 'SESSION', '127.0.0.1 (Localhost)', 18), ('CREATE', '2026-08-13 15:00:37.000', 'cse', 'Created feedback session SR1BM2G for Sem 6 Sec C', 'Brave on Windows', 'SESSION', '127.0.0.1 (Localhost)', 19), ('CREATE', '2026-08-13 15:01:29.000', 'cse', 'Created feedback session SQETDLC for Sem 6 Sec A', 'Brave on Android', 'SESSION', '127.0.0.1 (Localhost)', 20), ('LOGOUT', '2026-08-13 15:19:15.000', 'cse', 'Logged out of the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 21), ('LOGIN', '2026-08-13 17:43:55.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 22), ('LOGIN', '2026-08-13 17:44:55.000', 'cse', 'Logged into the system', 'Brave on Android', 'AUTH', '127.0.0.1 (Localhost)', 23), ('LOGIN', '2026-08-13 17:47:54.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 24), ('LOGIN', '2026-08-13 17:48:26.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 25), ('LOGOUT', '2026-08-13 18:01:06.000', 'cse', 'Logged out of the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 26), ('LOGIN', '2026-08-13 19:51:32.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 27), ('LOGOUT', '2026-08-13 20:12:34.000', 'cse', 'Logged out of the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 28), ('LOGIN', '2026-08-13 20:12:48.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 29), ('CREATE', '2026-08-13 20:24:19.000', 'cse', 'Assigned M23BXX604 (Sem 4, Sec C) to MH23CS225', 'Brave on Windows', 'ASSIGNMENT', '127.0.0.1 (Localhost)', 30), ('CREATE', '2026-08-13 20:24:30.000', 'cse', 'Assigned M23BCS405 (Sem 3, Sec B) to MH23CS225', 'Brave on Windows', 'ASSIGNMENT', '127.0.0.1 (Localhost)', 31), ('LOGIN', '2026-08-15 09:24:29.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 32), ('LOGIN', '2026-08-15 09:46:41.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 33), ('LOGOUT', '2026-08-15 10:19:46.000', 'cse', 'Logged out of the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 34), ('LOGIN', '2026-08-15 10:21:08.000', 'cse', 'Logged into the system', 'Brave on Windows', 'AUTH', '127.0.0.1 (Localhost)', 35), ('LOGIN', '2026-08-15 13:52:58.000', 'CSE', 'Logged into the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 64), ('LOGIN', '2026-08-16 10:29:07.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 65), ('LOGOUT', '2026-08-16 10:34:54.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 66), ('LOGIN', '2026-08-16 10:40:28.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 67), ('LOGOUT', '2026-08-16 11:09:46.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 68), ('LOGIN', '2026-08-16 11:18:24.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 69), ('DELETE', '2026-08-16 11:44:31.000', 'CSE', 'Deleted faculty member MH23CS226', 'Chrome on Windows', 'FACULTY', '127.0.0.1 (Localhost)', 70), ('LOGOUT', '2026-08-16 12:11:01.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 71), ('LOGIN', '2026-08-16 12:11:17.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 72), ('LOGIN', '2026-08-16 12:13:29.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 73), ('LOGIN', '2026-08-16 19:10:20.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 74), ('LOGOUT', '2026-08-16 19:27:33.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 75), ('LOGIN', '2026-08-16 19:28:28.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 76), ('LOGOUT', '2026-08-16 19:30:12.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 77), ('LOGIN', '2026-08-16 19:51:02.000', 'CSE', 'Logged into the system', 'Mobile Safari on iOS', 'AUTH', '127.0.0.1 (Localhost)', 80), ('LOGIN', '2026-08-16 20:39:13.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 81), ('LOGOUT', '2026-08-16 20:43:10.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 82), ('LOGIN', '2026-08-16 20:51:04.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 83), ('LOGOUT', '2026-08-16 21:02:30.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 84), ('DELETE', '2026-08-16 21:42:49.000', 'CSE', 'Wiped all feedback data for department CSE', 'Chrome on Windows', 'SESSION', '127.0.0.1 (Localhost)', 85), ('LOGIN', '2026-08-16 22:41:44.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 86), ('LOGOUT', '2026-08-16 22:46:50.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 87), ('LOGIN', '2026-08-17 17:26:37.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 88), ('LOGOUT', '2026-08-17 17:31:55.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 89), ('LOGIN', '2026-08-17 17:32:15.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 90), ('LOGOUT', '2026-08-17 17:35:22.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 91), ('LOGIN', '2026-08-17 17:37:57.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 92), ('LOGIN', '2026-08-17 17:50:04.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 93), ('LOGIN', '2026-08-17 21:50:47.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 94), ('LOGOUT', '2026-08-17 23:36:23.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 95), ('LOGIN', '2026-08-18 10:09:15.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 96), ('LOGIN', '2026-08-18 10:13:43.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 97), ('LOGOUT', '2026-08-18 10:14:02.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 98), ('LOGIN', '2026-08-19 21:45:31.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 99), ('LOGOUT', '2026-08-19 21:45:53.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 100), ('LOGOUT', '2026-08-19 22:52:24.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 101), ('LOGIN', '2026-08-21 10:04:05.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 102), ('LOGOUT', '2026-08-21 10:08:26.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 103), ('LOGOUT', '2026-08-21 10:38:04.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 104), ('LOGOUT', '2026-08-21 10:38:09.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 105), ('LOGIN', '2026-08-21 18:46:57.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 106), ('LOGOUT', '2026-08-21 19:03:14.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 107), ('LOGOUT', '2026-08-21 19:07:29.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 108), ('LOGOUT', '2026-08-21 19:26:31.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 109), ('LOGOUT', '2026-08-21 19:41:11.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 110), ('LOGIN', '2026-08-24 19:21:54.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 111), ('LOGOUT', '2026-08-24 22:22:41.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 112), ('LOGOUT', '2026-08-24 22:30:25.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 113), ('LOGOUT', '2026-08-24 22:30:34.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 114), ('LOGOUT', '2026-08-24 23:39:40.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 115), ('LOGIN', '2026-08-25 09:55:14.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 116), ('LOGOUT', '2026-08-25 09:55:36.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 117), ('LOGOUT', '2026-08-25 09:58:52.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 118), ('LOGIN', '2026-08-25 10:12:59.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 119), ('CREATE', '2026-08-25 10:16:37.000', 'CSE', 'Assigned M23BCS607B (Sem 6, Sec A) to MH23CS225', 'Chrome on Windows', 'ASSIGNMENT', '127.0.0.1 (Localhost)', 120), ('LOGOUT', '2026-08-25 10:20:21.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 121), ('LOGOUT', '2026-08-25 10:38:36.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 122), ('LOGIN', '2026-08-25 11:24:50.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 123), ('LOGOUT', '2026-08-25 11:27:01.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 124), ('LOGOUT', '2026-08-26 22:33:36.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 125), ('LOGIN', '2026-08-31 01:18:28.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 126), ('LOGOUT', '2026-08-31 01:25:35.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 127), ('LOGOUT', '2026-08-31 01:25:43.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 128), ('LOGIN', '2026-08-31 01:26:46.000', 'CSE', 'Logged into the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 129), ('LOGOUT', '2026-08-31 01:29:51.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 130), ('LOGIN', '2026-08-31 11:29:31.000', 'CSE', 'Logged into the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 131), ('LOGOUT', '2026-08-31 11:32:15.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 132), ('LOGOUT', '2026-08-31 11:33:56.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 133), ('LOGIN', '2026-08-31 11:34:39.000', 'CSE', 'Logged into the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 134), ('LOGOUT', '2026-08-31 11:34:56.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 135), ('DELETE', '2026-08-31 11:41:41.000', 'ADMIN', 'Purged data for department ECE', 'Mobile Chrome on Android', 'SYSTEM', '127.0.0.1 (Localhost)', 136), ('UPDATE', '2026-08-31 11:43:25.000', 'ADMIN', 'Set department ECE to Inactive', 'Mobile Chrome on Android', 'SYSTEM', '127.0.0.1 (Localhost)', 137), ('UPDATE', '2026-08-31 11:43:27.000', 'ADMIN', 'Set department ECE to Active', 'Mobile Chrome on Android', 'SYSTEM', '127.0.0.1 (Localhost)', 138), ('LOGIN', '2026-08-31 14:02:37.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 139), ('LOGOUT', '2026-08-31 15:42:54.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 140), ('LOGIN', '2026-08-31 22:51:54.000', 'CSE', 'Logged into the system', 'Mobile Safari on iOS', 'AUTH', '127.0.0.1 (Localhost)', 141), ('LOGOUT', '2026-09-01 00:09:11.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 142), ('LOGIN', '2026-09-01 12:12:47.000', 'CSE', 'Logged into the system', 'Mobile Safari on iOS', 'AUTH', '127.0.0.1 (Localhost)', 143), ('LOGOUT', '2026-09-01 14:29:27.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 144), ('LOGOUT', '2026-09-01 15:16:35.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 145), ('LOGIN', '2026-09-01 15:18:26.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 146), ('LOGOUT', '2026-09-01 16:42:42.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 147), ('LOGIN', '2026-09-01 19:39:59.000', 'CSE', 'Logged into the system', 'Mobile Safari on iOS', 'AUTH', '127.0.0.1 (Localhost)', 148), ('DELETE', '2026-09-01 20:18:40.000', 'CSE', 'Bulk deleted 59 students', 'Chrome on Windows', 'STUDENT', '127.0.0.1 (Localhost)', 149), ('DELETE', '2026-09-01 20:18:50.000', 'CSE', 'Deleted feedback session SQETDLC', 'Chrome on Windows', 'SESSION', '127.0.0.1 (Localhost)', 150), ('UPLOAD', '2026-09-01 20:37:20.000', 'CSE', 'Bulk uploaded 1 students', 'Chrome on Windows', 'STUDENT', '127.0.0.1 (Localhost)', 151), ('CREATE', '2026-09-01 20:41:01.000', 'CSE', 'Created feedback session SBYFLQE for Sem 6 Sec A', 'Chrome on Windows', 'SESSION', '127.0.0.1 (Localhost)', 152), ('LOGOUT', '2026-09-02 00:25:11.000', 'CSE', 'Logged out of the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 153), ('LOGIN', '2026-09-04 11:11:33.000', 'CSE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 154), ('LOGIN', '2026-09-04 12:03:35.000', 'CSE', 'Logged into the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 155), ('LOGOUT', '2026-09-04 12:03:39.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 156), ('LOGIN', '2026-09-04 12:04:07.000', 'CSE', 'Logged into the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 157), ('LOGOUT', '2026-09-04 12:04:21.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 158), ('LOGIN', '2026-09-04 12:05:13.000', 'CSE', 'Logged into the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 159), ('LOGOUT', '2026-09-04 12:05:48.000', 'CSE', 'Logged out of the system', 'Mobile Chrome on Android', 'AUTH', '127.0.0.1 (Localhost)', 160), ('DELETE', '2026-09-08 20:08:49.000', 'ADMIN', 'Purged data for department ECE', 'Chrome on Windows', 'SYSTEM', '127.0.0.1 (Localhost)', 161), ('LOGIN', '2026-09-08 20:10:14.000', 'ECE', 'Logged into the system', 'Chrome on Windows', 'AUTH', '127.0.0.1 (Localhost)', 162);

DROP TABLE IF EXISTS global_pending_faculty_registrations;
CREATE TABLE `global_pending_faculty_registrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `faculty_id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `dept_id` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS express_sessions;
CREATE TABLE `express_sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
