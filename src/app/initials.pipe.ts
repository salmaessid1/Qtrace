import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'initials'
})
export class InitialsPipe implements PipeTransform {
  transform(name: string): string {
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }
}