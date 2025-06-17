// AI Summary: Unit tests for the DependencyScanner service.
// Verifies correct dependency extraction for various languages (JS/TS, Python, CSS)
// and handles edge cases like commented-out code and unsupported file types.

import { DependencyScanner } from './DependencyScanner';

describe('DependencyScanner', () => {
  describe('JavaScript / TypeScript', () => {
    const tsFilePath = 'test/component.ts';

    it('should find standard import statements', () => {
      const content = `
        import * as React from 'react';
        import { MyComponent } from './MyComponent';
        import '../styles/main.css';
      `;
      const dependencies = DependencyScanner.scan(tsFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['react', './MyComponent', '../styles/main.css']));
      expect(dependencies).toHaveLength(3);
    });

    it('should find require statements', () => {
      const content = `const fs = require('fs'); const path = require("path");`;
      const dependencies = DependencyScanner.scan(tsFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['fs', 'path']));
      expect(dependencies).toHaveLength(2);
    });

    it('should find dynamic import statements', () => {
        const content = `
            const module = await import('./dynamicModule');
            import('another-module').then(m => {});
        `;
        const dependencies = DependencyScanner.scan(tsFilePath, content);
        expect(dependencies).toEqual(expect.arrayContaining(['./dynamicModule', 'another-module']));
        expect(dependencies).toHaveLength(2);
    });

    it('should find export from statements', () => {
      const content = `
        export { Button } from './Button';
        export * from "./hooks";
      `;
      const dependencies = DependencyScanner.scan(tsFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['./Button', './hooks']));
      expect(dependencies).toHaveLength(2);
    });

    it('should ignore commented-out imports', () => {
      const content = `
        // import fs from 'fs';
        import path from 'path';
        /*
        import os from 'os';
        const express = require('express');
        */
      `;
      const dependencies = DependencyScanner.scan(tsFilePath, content);
      expect(dependencies).toEqual(['path']);
    });

    it('should handle a mix of import types and ignore duplicates', () => {
      const content = `
        import React from 'react';
        import { Something } from './utils';
        const utils = require('./utils');
        export { Something } from './utils';
      `;
      const dependencies = DependencyScanner.scan(tsFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['react', './utils']));
      expect(dependencies).toHaveLength(2);
    });
  });

  describe('Python', () => {
    const pyFilePath = 'app/main.py';

    it('should find standard import statements', () => {
      const content = `
import os
import sys
import pandas as pd
      `;
      const dependencies = DependencyScanner.scan(pyFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['os', 'sys', 'pandas']));
      expect(dependencies).toHaveLength(3);
    });

    it('should find "from ... import ..." statements', () => {
      const content = `
from my_module import helper
from my_package.core import processor
      `;
      const dependencies = DependencyScanner.scan(pyFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['my_module', 'my_package.core']));
      expect(dependencies).toHaveLength(2);
    });

    it('should ignore commented-out imports', () => {
      const content = `
# import old_module
from new_module import feature
      `;
      const dependencies = DependencyScanner.scan(pyFilePath, content);
      expect(dependencies).toEqual(['new_module']);
    });

    it('should find relative import statements', () => {
      const content = `
from . import models
from .utils import helper
from ..config import settings
from ..package.module import thing
      `;
      const dependencies = DependencyScanner.scan(pyFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['.', '.utils', '..config', '..package.module']));
      expect(dependencies).toHaveLength(4);
    });

    it('should handle mixed imports and ignore duplicates', () => {
      const content = `
import services
from services import api
from services.utils import helper
      `;
      const dependencies = DependencyScanner.scan(pyFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['services', 'services.utils']));
      expect(dependencies).toHaveLength(2);
    });
  });

  describe('CSS / SCSS / Less', () => {
    it('should find @import statements in CSS files', () => {
      const cssFilePath = 'styles/main.css';
      const content = `
        @import url('normalize.css');
        @import './variables.css';
        @import "typography.css";
      `;
      const dependencies = DependencyScanner.scan(cssFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['normalize.css', './variables.css', 'typography.css']));
      expect(dependencies).toHaveLength(3);
    });

    it('should find @import statements in SCSS files', () => {
      const scssFilePath = 'styles/main.scss';
      const content = `
        @import 'base/reset';
        @import "components/button"; // No extension needed in scss
        /* @import 'commented/out'; */
      `;
      const dependencies = DependencyScanner.scan(scssFilePath, content);
      expect(dependencies).toEqual(expect.arrayContaining(['base/reset', 'components/button']));
      expect(dependencies).toHaveLength(2);
    });
  });

  describe('General Behavior', () => {
    it('should return an empty array for unsupported file types', () => {
      const content = `some content`;
      const dependencies = DependencyScanner.scan('document.md', content);
      expect(dependencies).toEqual([]);
    });

    it('should return an empty array for files with no dependencies', () => {
      const content = `const x = 1;`;
      const dependencies = DependencyScanner.scan('no-deps.js', content);
      expect(dependencies).toEqual([]);
    });

    it('should return an empty array for empty files', () => {
      const content = ``;
      const dependencies = DependencyScanner.scan('empty.ts', content);
      expect(dependencies).toEqual([]);
    });
  });
});
