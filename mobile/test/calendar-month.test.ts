import assert from 'node:assert/strict';
import test from 'node:test';
import {calendarDays,eventDay,moveMonth} from '../src/utils/calendar-month';
test('month grid starts Monday, ends Sunday and includes the complete month',()=>{for(const month of ['2026-11-01','2024-02-01','2021-02-01','2027-01-01']){const days=calendarDays(month);assert.equal(new Date(days[0]+'T12:00:00Z').getUTCDay(),1);assert.equal(new Date(days.at(-1)!+'T12:00:00Z').getUTCDay(),0);assert.equal(days.length%7,0);assert.ok(days.length<=42);assert.equal(new Set(days).size,days.length);}assert.ok(calendarDays('2024-02-01').includes('2024-02-29'));assert.equal(calendarDays('2021-02-01').length,28);});
test('month navigation crosses years without skipping short months',()=>{assert.equal(moveMonth('2026-12-31',1),'2027-01-01');assert.equal(moveMonth('2027-01-01',-1),'2026-12-01');assert.equal(moveMonth('2024-03-31',-1),'2024-02-01');});
test('calendar groups instants by Bogota civil date, not UTC or device timezone',()=>{assert.equal(eventDay('2026-11-19T04:59:59Z'),'2026-11-18');assert.equal(eventDay('2026-11-19T05:00:00Z'),'2026-11-19');});
