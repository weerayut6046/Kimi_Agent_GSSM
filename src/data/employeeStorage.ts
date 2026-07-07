import type { User, EmployeeProfile, Position, Skill } from '@/types';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/security';
import { logAudit, checkForRLSError } from './coreStorage';

// Helper function to map database row (lowercase) to TypeScript type (camelCase)
export const mapUserFromDb = (row: Record<string, unknown>): User => ({
  id: row.id as string,
  authUid: (row.authuid || row.authUid) as string,
  email: row.email as string,
  password: row.password as string,
  role: row.role as 'admin' | 'manager' | 'staff',
  profileId: row.profileid as string,
  createdAt: row.createdat as string,
  updatedAt: row.updatedat as string,
});

export const userStorage = {
  getAll: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      checkForRLSError(error, 'ดึงข้อมูล users');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapUserFromDb(row));
  },
  getById: async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapUserFromDb(data as Record<string, unknown>) : undefined;
  },
  getByAuthUid: async (authUid: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('authuid', authUid).single();
    if (error) {
      if (error.code !== 'PGRST116') console.error(error);
      return undefined;
    }
    return data ? mapUserFromDb(data as Record<string, unknown>) : undefined;
  },
  getByEmail: async (email: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error) {
      if (error.code !== 'PGRST116') console.error(error);
      return undefined;
    }
    return data ? mapUserFromDb(data as Record<string, unknown>) : undefined;
  },
  create: async (user: User): Promise<void> => {
    const dbUser = {
      id: user.id,
      authuid: user.authUid,
      email: user.email,
      password: user.password,
      role: user.role,
      profileid: user.profileId,
      createdat: user.createdAt,
      updatedat: user.updatedAt,
    };
    const { error } = await supabase.from('users').insert(dbUser);
    if (error) console.error(error);
    else await logAudit({ tableName: 'users', recordId: user.id, action: 'create', newValue: dbUser });
  },
  update: async (id: string, updates: Partial<User>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.authUid !== undefined) dbUpdates.authuid = updates.authUid;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.profileId !== undefined) dbUpdates.profileid = updates.profileId;
    if (updates.updatedAt !== undefined) dbUpdates.updatedat = updates.updatedAt;

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'users', recordId: id, action: 'update', newValue: dbUpdates });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'users', recordId: id, action: 'delete' });
  },
};

// Helper to split fullName into firstName and lastName for DB compatibility
export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

// Employee Storage
// Helper function to map database row (lowercase) to TypeScript type (camelCase)
export const mapProfileFromDb = (row: Record<string, unknown>): EmployeeProfile => ({
  id: row.id as string,
  userId: row.userid as string,
  firstName: (row.firstname as string) || '',
  lastName: (row.lastname as string) || '',
  fullName: (row.fullname as string) || `${row.firstname || ''} ${row.lastname || ''}`.trim(),
  phone: row.phone as string,
  avatar: row.avatar as string,
  positionId: row.positionid as string,
  stationId: row.stationid as string,
  status: row.status as 'active' | 'inactive',
  hireDate: row.hiredate as string,
  position: { id: '', name: '', description: '' },
  skills: [],
});

export const employeeStorage = {
  getAll: async (): Promise<EmployeeProfile[]> => {
    const [{ data: profiles }, { data: profileSkills }, { data: positions }, { data: skills }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('profile_skills').select('*'),
      supabase.from('positions').select('*'),
      supabase.from('skills').select('*'),
    ]);

    return (profiles || []).map((row: Record<string, unknown>) => {
      const profile = mapProfileFromDb(row);
      const position = (positions || []).find((p: Position) => p.id === profile.positionId);
      const skillIds = (profileSkills || [])
        .filter((ps: Record<string, unknown>) => ps.profileid === profile.id)
        .map((ps: Record<string, unknown>) => ps.skillid as string);
      const employeeSkills = (skills || []).filter((s: Skill) => skillIds.includes(s.id));

      return {
        ...profile,
        position: position || { id: '', name: '', description: '' },
        skills: employeeSkills,
      } as EmployeeProfile;
    });
  },
  getById: async (id: string): Promise<EmployeeProfile | undefined> => {
    const [{ data: row }, { data: profileSkills }, { data: positions }, { data: skills }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('profile_skills').select('*').eq('profileid', id),
      supabase.from('positions').select('*'),
      supabase.from('skills').select('*'),
    ]);

    if (!row) return undefined;

    const profile = mapProfileFromDb(row);
    const position = (positions || []).find((p: Position) => p.id === profile.positionId);
    const skillIds = (profileSkills || []).map((ps: Record<string, unknown>) => ps.skillid as string);
    const employeeSkills = (skills || []).filter((s: Skill) => skillIds.includes(s.id));

    return {
      ...profile,
      position: position || { id: '', name: '', description: '' },
      skills: employeeSkills,
    } as EmployeeProfile;
  },
  getByUserId: async (userId: string): Promise<EmployeeProfile | undefined> => {
    const { data: row, error } = await supabase.from('profiles').select('*').eq('userid', userId).single();
    if (error || !row) return undefined;
    const profile = mapProfileFromDb(row);
    return employeeStorage.getById(profile.id);
  },
  create: async (employee: EmployeeProfile & { email?: string; password?: string; role?: 'admin' | 'manager' | 'staff' }): Promise<boolean> => {
    const profileData = employee;
    const { skills, email, password, role } = employee;

    const { firstName, lastName } = splitFullName(profileData.fullName);

    // 1. Create profile first (without userId)
    const dbProfileData = {
      id: profileData.id,
      userid: '', // Will be updated after user creation
      firstname: firstName,
      lastname: lastName,
      fullname: profileData.fullName,
      phone: profileData.phone,
      avatar: profileData.avatar,
      positionid: profileData.positionId,
      stationid: profileData.stationId,
      status: profileData.status,
      hiredate: profileData.hireDate,
    } as Record<string, unknown>;

    const { error: profileError } = await supabase.from('profiles').insert(dbProfileData);
    if (profileError) {
      console.error('Error creating profile:', profileError);
      return false;
    }
    await logAudit({ tableName: 'profiles', recordId: profileData.id, action: 'create', newValue: dbProfileData });

    // 2. Create user if email, password, and role are provided
    if (email && password && role) {
      const userId = `usr${Date.now()}`;
      const now = new Date().toISOString();
      const hashedPassword = await hashPassword(password);

      const dbUser = {
        id: userId,
        authuid: null, // Will be linked when auth user is created
        email: email,
        password: hashedPassword,
        role: role,
        profileid: profileData.id,
        createdat: now,
        updatedat: now,
      };

      const { error: userError } = await supabase.from('users').insert(dbUser);
      if (userError) {
        console.error('Error creating user:', userError);
        // Don't fail - profile was created successfully
      } else {
        // 3. Update profile with userId
        await supabase.from('profiles').update({ userid: userId }).eq('id', profileData.id);

        // 4. Try to create auth user (may fail due to rate limits)
        try {
          const { data: signUpData, error: authError } = await supabase.auth.signUp({
            email,
            password,
          });
          if (authError) {
            console.warn('Could not create auth user (rate limit or other error):', authError.message);
            console.warn('Please create auth user manually in Supabase Dashboard and run:');
            console.warn(`UPDATE users SET authuid = (SELECT id FROM auth.users WHERE email = '${email}') WHERE email = '${email}';`);
          } else if (signUpData?.user) {
            // Link auth user to our users table immediately
            await supabase.from('users').update({ authuid: signUpData.user.id }).eq('id', userId);

          } else {
            console.warn('Auth signup succeeded but no user returned (email confirmation may be required)');
            console.warn('Please create auth user manually in Supabase Dashboard if needed');
          }
        } catch (authErr) {
          console.warn('Auth signup error:', authErr);
        }
      }
    }

    // 5. Create profile_skills
    if (skills && skills.length > 0) {
      const psRows = skills.map(s => ({ profileid: employee.id, skillid: s.id }));
      await supabase.from('profile_skills').insert(psRows);
    }

    return true;
  },
  update: async (id: string, updates: Partial<EmployeeProfile> & { email?: string; password?: string; role?: 'admin' | 'manager' | 'staff' }): Promise<void> => {
    const profileData = updates;
    const { skills } = updates;

    if (profileData.fullName !== undefined) {
      const { firstName, lastName } = splitFullName(profileData.fullName);
      profileData.firstName = firstName;
      profileData.lastName = lastName;
    }

    const dbProfileData: Record<string, unknown> = {};
    if (profileData.firstName !== undefined) dbProfileData.firstname = profileData.firstName;
    if (profileData.lastName !== undefined) dbProfileData.lastname = profileData.lastName;
    if (profileData.fullName !== undefined) dbProfileData.fullname = profileData.fullName;
    if (profileData.phone !== undefined) dbProfileData.phone = profileData.phone;
    if (profileData.avatar !== undefined) dbProfileData.avatar = profileData.avatar;
    if (profileData.positionId !== undefined) dbProfileData.positionid = profileData.positionId;
    if (profileData.stationId !== undefined) dbProfileData.stationid = profileData.stationId;
    if (profileData.status !== undefined) dbProfileData.status = profileData.status;
    if (profileData.hireDate !== undefined) dbProfileData.hiredate = profileData.hireDate;
    if (profileData.userId !== undefined) dbProfileData.userid = profileData.userId;

    const { error } = await supabase.from('profiles').update(dbProfileData).eq('id', id);
    if (error) console.error('Error updating profile:', error);
    else await logAudit({ tableName: 'profiles', recordId: id, action: 'update', newValue: dbProfileData });

    if (skills) {
      await supabase.from('profile_skills').delete().eq('profileid', id);
      if (skills.length > 0) {
        const psRows = skills.map(s => ({ profileid: id, skillid: s.id }));
        const { error: psError } = await supabase.from('profile_skills').insert(psRows);
        if (psError) console.error('Error updating profile_skills:', psError);
      }
    }
  },
  delete: async (id: string): Promise<void> => {
    const { data: userData } = await supabase.from('users').select('id').eq('profileid', id);
    if (userData && userData.length > 0) {
      const userIds = userData.map((u: { id: string }) => u.id);
      const { error: userError } = await supabase.from('users').delete().in('id', userIds);
      if (userError) console.error('Error deleting user:', userError);
    }

    await supabase.from('profile_skills').delete().eq('profileid', id);

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) console.error('Error deleting profile:', error);
    else await logAudit({ tableName: 'profiles', recordId: id, action: 'delete' });
  },
};

// Position Storage
export const positionStorage = {
  getAll: async (): Promise<Position[]> => {
    const { data, error } = await supabase.from('positions').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []) as Position[];
  },
  getById: async (id: string): Promise<Position | undefined> => {
    const { data, error } = await supabase.from('positions').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data as Position;
  },
  create: async (position: Position): Promise<void> => {
    const { error } = await supabase.from('positions').insert(position);
    if (error) console.error(error);
    else await logAudit({ tableName: 'positions', recordId: position.id, action: 'create', newValue: position });
  },
  update: async (id: string, updates: Partial<Position>): Promise<void> => {
    const { error } = await supabase.from('positions').update(updates).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'positions', recordId: id, action: 'update', newValue: updates as Record<string, unknown> });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'positions', recordId: id, action: 'delete' });
  },
};

// Skill Storage
export const skillStorage = {
  getAll: async (): Promise<Skill[]> => {
    const { data, error } = await supabase.from('skills').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []) as Skill[];
  },
  getById: async (id: string): Promise<Skill | undefined> => {
    const { data, error } = await supabase.from('skills').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data as Skill;
  },
  create: async (skill: Skill): Promise<void> => {
    const { error } = await supabase.from('skills').insert(skill);
    if (error) console.error(error);
    else await logAudit({ tableName: 'skills', recordId: skill.id, action: 'create', newValue: skill });
  },
  update: async (id: string, updates: Partial<Skill>): Promise<void> => {
    const { error } = await supabase.from('skills').update(updates).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'skills', recordId: id, action: 'update', newValue: updates as Record<string, unknown> });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'skills', recordId: id, action: 'delete' });
  },
};
