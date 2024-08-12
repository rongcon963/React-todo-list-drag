import logo from './logo.svg';

import React, { useState, useEffect, useCallback } from 'react';
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';
import { v4 as uuidv4 } from 'uuid';  // Note: `uuidv1` is deprecated, use `uuidv4` instead
import { fromJS } from 'immutable';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

import Column from './components/Column/';
import AddNewModal from './components/AddNewModal/';
import Task from './components/Task/';
import './App.css';

function App() {
  const [displayModal, setDisplayModal] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [editedTaskId, setEditedTaskId] = useState(null);
  const [columns, setColumns] = useState(fromJS([
    { id: 'td', title: 'TO DO', tasks: [] },
    { id: 'ip', title: 'IN PROGRESS', tasks: [] },
    { id: 'de', title: 'DONE', tasks: [] }
  ]));

  useEffect(() => {
    const storedColumns = localStorage.getItem('columns');
    if (storedColumns) {
      setColumns(fromJS(JSON.parse(storedColumns)));
    }
  }, []);

  const handleToggleModal = useCallback((choosenColumn = '') => () => {
    setDisplayModal(prev => !prev);
    setEditingColumnIndex(choosenColumn);
  }, []);

  const handleChangeTaskContent = (e) => setTaskContent(e.target.value);

  const handleChangeEditingColumnIndex = useCallback((index) => () => {
    setEditingColumnIndex(index);
  }, []);

  const handleAddNewTask = useCallback(() => {
    if (taskContent.trim() === '') {
      toastr.warning('Please enter your task', 'Notice', { timeOut: 2000 });
      return;
    }

    const newTask = fromJS({
      id: uuidv4(),
      content: taskContent,
      time: new Date().toLocaleString()
    });

    const columnIndex = columns.findIndex(column => column.get('id') === editingColumnIndex);
    const updatedColumn = columns.updateIn([columnIndex, 'tasks'], tasks => tasks.push(newTask));

    setColumns(updatedColumn);
    setDisplayModal(false);
    setEditingColumnIndex('');
    setTaskContent('');
    
    localStorage.setItem('columns', JSON.stringify(updatedColumn.toJS()));
  }, [taskContent, columns, editingColumnIndex]);

  const handleDeleteTask = useCallback((columnIndex, taskIndex) => () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const updatedColumn = columns.updateIn(
        [columnIndex, 'tasks'],
        tasks => tasks.remove(taskIndex)
      );

      setColumns(updatedColumn);
      toastr.success('Delete task success', 'Notice', { timeOut: 2000 });
      
      localStorage.setItem('columns', JSON.stringify(updatedColumn.toJS()));
    }
  }, [columns]);

  const handleChooseEditTask = useCallback((columnIndex, taskIndex, taskId) => () => {
    setEditingColumnIndex(columnIndex);
    setEditingTaskIndex(taskIndex);
    setEditedTaskId(taskId);
  }, []);

  const handleEdit = useCallback(() => {
    const updatedColumn = columns.updateIn(
      [editingColumnIndex, 'tasks'],
      tasks => tasks.setIn([editingTaskIndex, 'content'], taskContent)
    );

    setColumns(updatedColumn);
    setEditingColumnIndex('');
    setTaskContent('');
    setEditedTaskId(null);
    setEditingTaskIndex(null);

    localStorage.setItem('columns', JSON.stringify(updatedColumn.toJS()));
  }, [taskContent, columns, editingColumnIndex, editingTaskIndex]);

  const handleCancelEdit = useCallback(() => {
    setEditingColumnIndex('');
    setTaskContent('');
    setEditedTaskId(null);
    setEditingTaskIndex(null);
  }, []);

  const handleSaveDrag = useCallback((result) => {
    const { source, destination, reason } = result;
    if (reason === 'DROP' && destination) {
      const sourceColumnIndex = columns.findIndex(column => column.get('id') === source.droppableId);
      const task = columns.getIn([sourceColumnIndex, 'tasks', source.index]);

      let updatedColumn = columns.updateIn(
        [sourceColumnIndex, 'tasks'],
        tasks => tasks.remove(source.index)
      );

      const destinationColumnIndex = columns.findIndex(column => column.get('id') === destination.droppableId);
      updatedColumn = updatedColumn.updateIn(
        [destinationColumnIndex, 'tasks'],
        tasks => tasks.insert(destination.index, task)
      );

      setColumns(updatedColumn);
      localStorage.setItem('columns', JSON.stringify(updatedColumn.toJS()));
    }
  }, [columns]);

  return (
    <div className="App">
      <h1 className="App__title">TO DO LIST</h1>
      <DragDropContext onDragEnd={handleSaveDrag}>
        <div className="App__content">
          {columns.map((column, columnIndex) => (
            <Column key={column.get('id')} column={column} handleAddNewTask={handleToggleModal}>
              <Droppable droppableId={column.get('id')}>
                {provided => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ minHeight: '300px' }}
                  >
                    {column.get('tasks').map((task, taskIndex) => (
                      <Task
                        key={task.get('id')}
                        index={taskIndex}
                        isEditing={task.get('id') === editedTaskId}
                        handleChangeTaskContent={handleChangeTaskContent}
                        task={task}
                        handleEdit={handleEdit}
                        handleCancelEdit={handleCancelEdit}
                        handleChooseEditTask={handleChooseEditTask(columnIndex, taskIndex, task.get('id'))}
                        handleDeleteTask={handleDeleteTask(columnIndex, taskIndex)}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </Column>
          ))}
        </div>
      </DragDropContext>
      {displayModal && (
        <AddNewModal
          editingColumnIndex={editingColumnIndex}
          taskContent={taskContent}
          handleChangeTaskContent={handleChangeTaskContent}
          handleChangeEditingColumnIndex={handleChangeEditingColumnIndex}
          handleAddNewTask={handleAddNewTask}
          handleToggleModal={handleToggleModal()}
          selectedColumn={editingColumnIndex}
          handleChangeSelectedColumn={handleChangeEditingColumnIndex}
        />
      )}
    </div>
  );
}

export default App;
