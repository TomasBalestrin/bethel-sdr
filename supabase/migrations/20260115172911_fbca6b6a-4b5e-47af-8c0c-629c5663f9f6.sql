-- Adicionar foreign keys para profiles (usando nomes diferentes para evitar conflito)
ALTER TABLE appointments
ADD CONSTRAINT appointments_sdr_profile_fkey 
FOREIGN KEY (sdr_id) REFERENCES profiles(user_id);

ALTER TABLE appointments
ADD CONSTRAINT appointments_closer_profile_fkey 
FOREIGN KEY (closer_id) REFERENCES profiles(user_id);

ALTER TABLE leads
ADD CONSTRAINT leads_assigned_sdr_profile_fkey 
FOREIGN KEY (assigned_sdr_id) REFERENCES profiles(user_id);

ALTER TABLE lead_activities
ADD CONSTRAINT lead_activities_user_profile_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id);