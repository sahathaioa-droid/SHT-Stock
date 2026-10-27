const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

const dataPath = path.join(__dirname, 'data', 'kpi.json');

function readData() {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/', (req, res) => {
  const data = readData();
  res.render('index', { title: 'หน้าแรก - หัวข้อเป้าหมายฝ่าย IT', data });
});



app.get('/progress', (req, res) => {
  const data = readData();
  res.render('progress', { title: 'ผลการดำเนินงาน', data });
});

app.get('/details', (req, res) => {
  const data = readData();
  res.render('details', { title: 'รายละเอียด', data });
});

app.get('/department/edit', (req, res) => {
  const data = readData();
  res.render('department_edit', { title: 'แก้ไขเป้าหมายฝ่าย IT', data });
});

app.post('/department/update', (req, res) => {
  const data = readData();
  const updates = req.body;
  
  if (data.departmentGoals) {
    data.departmentGoals = data.departmentGoals.map(goal => {
      const key = `goal_${goal.id}`;
      if (updates[key] !== undefined && updates[key] !== '') {
        return { ...goal, progress: parseFloat(updates[key]) };
      }
      return goal;
    });
  }
  
  if (data.individualGoals && data.individualGoals.manager) {
    data.individualGoals.manager = data.individualGoals.manager.map(goal => {
      const key = `manager_${goal.id}`;
      if (updates[key] !== undefined && updates[key] !== '') {
        return { ...goal, progress: parseFloat(updates[key]) };
      }
      return goal;
    });
  }
  
  if (data.individualGoals && data.individualGoals.staff) {
    data.individualGoals.staff = data.individualGoals.staff.map(goal => {
      const key = `staff_${goal.id}`;
      if (updates[key] !== undefined && updates[key] !== '') {
        return { ...goal, progress: parseFloat(updates[key]) };
      }
      return goal;
    });
  }
  
  writeData(data);
  res.redirect('/');
});



app.post('/progress/update', (req, res) => {
  const data = readData();
  const { month, description, percentage } = req.body;
  
  if (month && description) {
    data.progress.push({
      id: Date.now(),
      month,
      description,
      percentage: parseFloat(percentage) || 0
    });
    writeData(data);
  }
  
  res.redirect('/progress');
});

app.post('/progress/delete/:id', (req, res) => {
  const data = readData();
  data.progress = data.progress.filter(p => p.id != req.params.id);
  writeData(data);
  res.redirect('/progress');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
