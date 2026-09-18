import { createRouter, createWebHistory } from 'vue-router';
import ProjectsView from '../views/ProjectsView.vue';
import ProjectDetailView from '../views/ProjectDetailView.vue';
import ComponentsView from '../views/ComponentsView.vue';
import ShoppingListView from '../views/ShoppingListView.vue';
import ReportsView from '../views/ReportsView.vue';
import ReleaseNotesView from '../views/ReleaseNotesView.vue';

const routes = [
  {
    path: '/',
    redirect: '/projects'
  },
  {
    path: '/projects',
    name: 'Projects',
    component: ProjectsView
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: ProjectDetailView
  },
  {
    path: '/components',
    name: 'Components',
    component: ComponentsView
  },
  {
    path: '/shopping-list',
    name: 'ShoppingList',
    component: ShoppingListView
  },
  {
    path: '/reports',
    name: 'Reports',
    component: ReportsView
  },
  {
    path: '/release-notes',
    name: 'ReleaseNotes',
    component: ReleaseNotesView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
