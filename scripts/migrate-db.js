const fs = require('fs');
const path = require('path');

const DB_FILE_PATH = path.join(__dirname, '..', 'db.json');
const COURSES_DIR = path.join(__dirname, '..', 'public', 'courses');

function runMigration() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    console.error('db.json not found!');
    return;
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));

  // 1. Map old course_id to new package_id
  // Neutral network and LLM: course_id "c7d711d9-a43e-4054-a643-60babf8228cf" -> package_id "a7f0a8eb-cd88-408b-b20e-da7f82101528"
  // Arduino: other course_ids -> package_id "b4409acb-13b0-4985-a2ea-6a0c8d4bd583"
  const arduinoPackageId = "b4409acb-13b0-4985-a2ea-6a0c8d4bd583";
  const llmPackageId = "a7f0a8eb-cd88-408b-b20e-da7f82101528";
  
  const courseIdToPackageId = {};
  
  // Build maps from course_package_items
  if (db.course_package_items) {
    db.course_package_items.forEach(item => {
      courseIdToPackageId[item.course_id] = item.package_id;
    });
  }

  // Fallbacks for known courses
  courseIdToPackageId["c7d711d9-a43e-4054-a643-60babf8228cf"] = llmPackageId;
  if (db.courses) {
    db.courses.forEach(c => {
      if (!courseIdToPackageId[c.id]) {
        courseIdToPackageId[c.id] = c.slug === 'neutral-network-and-llm' ? llmPackageId : arduinoPackageId;
      }
    });
  }

  // 2. Fetch config.json for each package to backfill toc and cards
  if (db.course_packages) {
    db.course_packages = db.course_packages.map(pkg => {
      // Find package config.json
      // Since it was split into subcourses before, let's see if we have a config.json in public/courses/[pkg.slug]
      // In the new layout, we will upload everything directly under public/courses/[pkg.slug].
      // For old data, we might need to look at public/courses/[pkg.slug]/config.json.
      const configPath = path.join(COURSES_DIR, pkg.slug, 'config.json');
      let toc = [];
      let cards = [];
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          toc = config.toc || [];
          cards = config.cards || [];
          console.log(`Backfilled toc/cards for package ${pkg.slug}`);
        } catch (e) {
          console.error(`Failed to parse config.json for ${pkg.slug}:`, e);
        }
      } else {
        // Fallback: If public/courses/[pkg.slug]/config.json doesn't exist,
        // it might still be in old structure (e.g. subcourses). 
        // For 'neutral-network-and-llm', the subcourse slug was also 'neutral-network-and-llm',
        // so its config.json should be in public/courses/neutral-network-and-llm/config.json
        // For 'iot-communication', the package didn't have a single config.json, but subcourses did (e.g. iot-communication-ch01).
        // Let's create a combined config.json for iot-communication if it doesn't exist.
        if (pkg.slug === 'iot-communication') {
          // Merge all subcourse config.json files under courses
          const subcourseSlugs = Array.from({length: 13}, (_, i) => `iot-communication-ch${String(i+1).padStart(2, '0')}`);
          subcourseSlugs.forEach(sub => {
            const subConfigPath = path.join(COURSES_DIR, sub, 'config.json');
            if (fs.existsSync(subConfigPath)) {
              try {
                const subConfig = JSON.parse(fs.readFileSync(subConfigPath, 'utf-8'));
                cards = cards.concat(subConfig.cards || []);
                // Simple merge of toc
                if (subConfig.toc) {
                  toc = toc.concat(subConfig.toc);
                }
              } catch (e) {}
            }
          });
          
          // Write merged config to package folder
          const targetDir = path.join(COURSES_DIR, pkg.slug);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          fs.writeFileSync(path.join(targetDir, 'config.json'), JSON.stringify({ cards, toc }, null, 2), 'utf-8');
          // Copy wiki.md and cards folder from first subcourse or merge them if necessary
          // For simplicity in migration, just copy from ch01 or allow it to look for subcourse folders for cards.
          // Let's copy wiki.md from ch01 to package
          const ch01Wiki = path.join(COURSES_DIR, 'iot-communication-ch01', 'wiki.md');
          if (fs.existsSync(ch01Wiki)) {
            fs.copyFileSync(ch01Wiki, path.join(targetDir, 'wiki.md'));
          }
          
          // Create cards directory and copy files
          const targetCardsDir = path.join(targetDir, 'cards');
          if (!fs.existsSync(targetCardsDir)) {
            fs.mkdirSync(targetCardsDir, { recursive: true });
          }
          subcourseSlugs.forEach(sub => {
            const subCardsDir = path.join(COURSES_DIR, sub, 'cards');
            if (fs.existsSync(subCardsDir)) {
              fs.readdirSync(subCardsDir).forEach(file => {
                fs.copyFileSync(path.join(subCardsDir, file), path.join(targetCardsDir, file));
              });
            }
          });
          console.log(`Created merged config/cards/wiki for package iot-communication`);
        }
      }

      return {
        ...pkg,
        toc,
        cards,
        // Default agent mappings from course_packages
        agent_id: pkg.agent_id || null
      };
    });
  }

  // 3. Migrate user_progress
  if (db.user_progress) {
    const migratedProgress = [];
    const seen = new Set(); // user_id - package_id combination

    db.user_progress.forEach(progress => {
      const packageId = courseIdToPackageId[progress.course_id] || progress.course_id;
      const key = `${progress.user_id}-${packageId}`;

      if (seen.has(key)) {
        // Merge with existing progress (keep max card, completion status)
        const existing = migratedProgress.find(p => p.user_id === progress.user_id && p.course_id === packageId);
        if (existing) {
          existing.last_card = Math.max(existing.last_card || 0, progress.last_card || 0);
          existing.max_card = Math.max(existing.max_card || 0, progress.max_card || 0);
          existing.completed = existing.completed || progress.completed || false;
          if (new Date(progress.updated_at) > new Date(existing.updated_at)) {
            existing.updated_at = progress.updated_at;
          }
        }
      } else {
        seen.add(key);
        migratedProgress.push({
          id: progress.id,
          user_id: progress.user_id,
          course_id: packageId, // We keep the key name "course_id" in database for query compatibility or map to course_id
          last_card: progress.last_card,
          max_card: progress.max_card,
          completed: progress.completed,
          created_at: progress.created_at,
          updated_at: progress.updated_at
        });
      }
    });
    db.user_progress = migratedProgress;
  }

  // 4. Remove courses and course_package_items
  delete db.courses;
  delete db.course_package_items;

  // 5. Save database
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log('Migration completed successfully!');
}

runMigration();
