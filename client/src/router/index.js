import { createRouter, createWebHistory } from 'vue-router';
import ProjectsView from '../views/ProjectsView.vue';
import ProjectDetailView from '../views/ProjectDetailView.vue';
import ComponentsView from '../views/ComponentsView.vue';
import ShoppingListView from '../views/ShoppingListView.vue';
import ReportsView from '../views/ReportsView.vue';
import SettingsView from '../views/SettingsView.vue';
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
    path: '/dictionaries',
    name: 'Dictionaries',
    component: () => import('../views/DictionariesView.vue')
  },
  {
    path: '/dictionaries/categories',
    name: 'CategoriesDictionary',
    component: () => import('../views/dictionaries/CategoriesDictionaryView.vue')
  },
  {
    path: '/dictionaries/packages',
    name: 'PackagesDictionary',
    component: () => import('../views/dictionaries/PackagesDictionaryView.vue')
  },
  {
    path: '/reports',
    name: 'Reports',
    component: ReportsView
  },
  {
    path: '/reports/production',
    name: 'ProductionReport',
    component: () => import('../views/reports/ProductionReportView.vue')
  },
  {
    path: '/reports/purchases',
    name: 'PurchasesReport',
    component: () => import('../views/reports/PurchasesReportView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
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
