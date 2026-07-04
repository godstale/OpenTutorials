import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');
const STORAGE_DIR = path.join(process.cwd(), 'public', 'courses');

export interface Filter {
  type: 'eq' | 'neq' | 'in';
  column: string;
  value: any;
}

export interface SerializedQuery {
  table: string;
  filters: Filter[];
  order: { column: string; ascending: boolean } | null;
  single: boolean;
  maybeSingle: boolean;
  limit: number | null;
}

// Default initial state matching the old Supabase tables
const DEFAULT_DB = {
  courses: [],
  course_cards: [],
  course_wiki: [],
  course_packages: [],
  course_package_items: [],
  user_package_subscriptions: [],
  user_progress: [],
  user_external_agents: [],
  user_external_agent_messages: [],
  macros: []
};

// Ensure db.json exists with defaults
function ensureDB() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

// Read database
export function readDB(): any {
  ensureDB();
  const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse db.json, returning empty structure', e);
    return DEFAULT_DB;
  }
}

// Write database
export function writeDB(dbData: any) {
  ensureDB();
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
}

// Mock uuid generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Execute serialized query
export function executeLocalQuery(query: SerializedQuery, action: string, data?: any) {
  // Handle storage mock actions
  if (action === 'storage_upload') {
    try {
      const { bucket, path: filePath, fileData } = data; // fileData is base64
      const targetPath = path.join(STORAGE_DIR, bucket === 'courses' ? '' : bucket, filePath);
      
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      
      const buffer = Buffer.from(fileData, 'base64');
      fs.writeFileSync(targetPath, buffer);
      
      return { data: { path: filePath }, error: null };
    } catch (e: any) {
      console.error('Failed to upload file to mock storage:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  if (action === 'rpc') {
    try {
      const { fn, args } = data;
      if (fn === 'prune_external_agent_messages') {
        const { p_agent_id } = args;
        const db = readDB();
        if (db.user_external_agent_messages) {
          // Filter messages for this agent
          const agentMsgs = db.user_external_agent_messages.filter(
            (m: any) => m.agent_id === p_agent_id
          );
          // Sort by created_at desc (or simply keep the last 100)
          agentMsgs.sort(
            (a: any, b: any) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
          
          const keepIds = new Set(agentMsgs.slice(0, 100).map((m: any) => m.id));
          
          // Update user_external_agent_messages
          db.user_external_agent_messages = db.user_external_agent_messages.filter(
            (m: any) => m.agent_id !== p_agent_id || keepIds.has(m.id)
          );
          writeDB(db);
        }
        return { data: null, error: null };
      }
      return { data: null, error: { message: `Unsupported RPC function: ${fn}` } };
    } catch (e: any) {
      console.error('Failed to execute RPC query:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  if (action === 'storage_download') {
    try {
      const { bucket, path: filePath } = data;
      const targetPath = path.join(STORAGE_DIR, bucket === 'courses' ? '' : bucket, filePath);
      
      if (!fs.existsSync(targetPath)) {
        return { data: null, error: { message: `File not found: ${filePath}`, code: '404' } };
      }
      
      const fileBuffer = fs.readFileSync(targetPath);
      const base64Data = fileBuffer.toString('base64');
      
      return { data: { base64: base64Data }, error: null };
    } catch (e: any) {
      console.error('Failed to download file from mock storage:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  const db = readDB();
  const table = query.table;
  
  if (!db[table]) {
    db[table] = [];
  }

  let items = [...db[table]];

  // 1. Filter items for non-insert actions
  if (action !== 'insert') {
    if (query.filters && query.filters.length > 0) {
      items = items.filter((item) => {
        return query.filters.every((f) => {
          const val = item[f.column];
          if (f.type === 'eq') {
            return val === f.value;
          } else if (f.type === 'neq') {
            return val !== f.value;
          } else if (f.type === 'in') {
            return Array.isArray(f.value) && f.value.includes(val);
          }
          return true;
        });
      });
    }
  }

  // 2. Perform DB operations
  if (action === 'select') {
    // Sort
    if (query.order) {
      const col = query.order.column;
      const asc = query.order.ascending;
      items.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (query.limit !== null) {
      items = items.slice(0, query.limit);
    }

    // Mock Auto Join Resolver for Select query
    if (items.length > 0) {
      if (table === 'user_progress') {
        const courses = db.courses || [];
        const packageItems = db.course_package_items || [];
        items = items.map((item) => {
          const course = courses.find((c: any) => c.id === item.course_id);
          const mappedPackageItems = packageItems.filter((pi: any) => pi.course_id === item.course_id);
          return {
            ...item,
            course: course ? {
              ...course,
              course_package_items: mappedPackageItems
            } : null
          };
        });
      }

      if (table === 'course_packages') {
        const packageItems = db.course_package_items || [];
        const courses = db.courses || [];
        items = items.map((pkg) => {
          const matchedItems = packageItems
            .filter((pi: any) => pi.package_id === pkg.id)
            .map((pi: any) => {
              const course = courses.find((c: any) => c.id === pi.course_id);
              return {
                ...pi,
                course: course || null
              };
            });
          return {
            ...pkg,
            items: matchedItems
          };
        });
      }

      if (table === 'user_package_subscriptions') {
        const packages = db.course_packages || [];
        const packageItems = db.course_package_items || [];
        const courses = db.courses || [];
        
        items = items.map((sub) => {
          const pkg = packages.find((p: any) => p.id === sub.package_id);
          let pkgWithItems = null;
          if (pkg) {
            const matchedItems = packageItems
              .filter((pi: any) => pi.package_id === pkg.id)
              .map((pi: any) => {
                const course = courses.find((c: any) => c.id === pi.course_id);
                return {
                  ...pi,
                  course: course || null
                };
              });
            pkgWithItems = {
              ...pkg,
              items: matchedItems
            };
          }
          return {
            ...sub,
            package: pkgWithItems
          };
        });
      }
    }

    // single / maybeSingle format
    if (query.single) {
      if (items.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: items[0], error: null };
    }

    if (query.maybeSingle) {
      return { data: items.length > 0 ? items[0] : null, error: null };
    }

    return { data: items, error: null };

  } else if (action === 'insert') {
    const insertData = Array.isArray(data) ? data : [data];
    const createdItems: any[] = [];
    
    for (const d of insertData) {
      const newItem = {
        id: d.id || uuidv4(),
        ...d,
        created_at: d.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // If table is packages/courses/etc, check duplicate slug
      if (d.slug) {
        const duplicate = db[table].find((x: any) => x.slug === d.slug);
        if (duplicate) {
          return { data: null, error: { message: `Duplicate key violation: slug ${d.slug} already exists`, code: '23505' } };
        }
      }

      db[table].push(newItem);
      createdItems.push(newItem);
    }

    writeDB(db);
    return { data: Array.isArray(data) ? createdItems : createdItems[0], error: null };

  } else if (action === 'upsert') {
    const upsertData = Array.isArray(data) ? data : [data];
    const upsertedItems: any[] = [];
    
    for (const d of upsertData) {
      let existingIndex = -1;
      if (d.id) {
        existingIndex = db[table].findIndex((x: any) => x.id === d.id);
      } else if (d.slug) {
        existingIndex = db[table].findIndex((x: any) => x.slug === d.slug);
      }

      if (existingIndex !== -1) {
        // Update existing record
        db[table][existingIndex] = {
          ...db[table][existingIndex],
          ...d,
          updated_at: new Date().toISOString()
        };
        upsertedItems.push(db[table][existingIndex]);
      } else {
        // Insert new record
        const newItem = {
          id: d.id || uuidv4(),
          ...d,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db[table].push(newItem);
        upsertedItems.push(newItem);
      }
    }

    writeDB(db);
    return { data: Array.isArray(data) ? upsertedItems : upsertedItems[0], error: null };

  } else if (action === 'update') {
    // Update all matching records
    const updatedIds = items.map((x) => x.id);
    db[table] = db[table].map((item: any) => {
      if (updatedIds.includes(item.id)) {
        return {
          ...item,
          ...data,
          updated_at: new Date().toISOString()
        };
      }
      return item;
    });

    writeDB(db);
    
    // Fetch updated ones
    const updatedItems = db[table].filter((x: any) => updatedIds.includes(x.id));
    if (query.single || query.maybeSingle) {
      return { data: updatedItems.length > 0 ? updatedItems[0] : null, error: null };
    }
    return { data: updatedItems, error: null };

  } else if (action === 'delete') {
    const deletedIds = items.map((x) => x.id);
    db[table] = db[table].filter((item: any) => !deletedIds.includes(item.id));
    
    writeDB(db);
    return { data: items, error: null };
  }

  return { data: null, error: { message: 'Unsupported action' } };
}
